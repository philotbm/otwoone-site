import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProjectEvent } from '@/lib/projectEvents';

type Params = { params: Promise<{ id: string }> };

type RevisionItem = {
  id: string;
  title: string;
  description: string;
  revision_type: string;
  status: string;
  priority: string;
  source: string;
  batch_label: string | null;
  created_at: string;
};

/**
 * POST /api/hub/projects/[id]/revisions/batch
 *
 * Hub-protected (middleware). Generates a structured execution batch payload
 * from queued/in-progress revision items.
 *
 * Body (optional):
 *   batch_label — filter to a specific batch label
 *
 * Returns { batch: ExecutionBatch }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    // empty body is fine
  }

  const batchLabel = body.batch_label ? String(body.batch_label).trim() : null;

  // Fetch project name via lead relation
  const { data: project } = await supabaseServer
    .from('projects')
    .select('id, lead_id')
    .eq('id', id)
    .single();

  let projectName: string | null = null;
  if (project?.lead_id) {
    const { data: lead } = await supabaseServer
      .from('leads')
      .select('company_name, contact_name')
      .eq('id', project.lead_id)
      .single();
    projectName = lead?.company_name ?? lead?.contact_name ?? null;
  }

  // Fetch revisions
  let query = supabaseServer
    .from('revision_items')
    .select('id, title, description, revision_type, status, priority, source, batch_label, created_at')
    .eq('project_id', id)
    .in('status', ['queued', 'in_progress'])
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (batchLabel) {
    query = query.eq('batch_label', batchLabel);
  }

  const { data: revisions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (revisions ?? []) as RevisionItem[];

  // Group by type
  const grouped: Record<string, RevisionItem[]> = {};
  for (const item of items) {
    const t = item.revision_type;
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(item);
  }

  // Counts
  const countByType: Record<string, number> = {};
  const countByPriority: Record<string, number> = {};
  for (const item of items) {
    countByType[item.revision_type] = (countByType[item.revision_type] ?? 0) + 1;
    countByPriority[item.priority] = (countByPriority[item.priority] ?? 0) + 1;
  }

  const batch = {
    project_id: id,
    project_name: projectName,
    batch_label: batchLabel,
    generated_at: new Date().toISOString(),
    total_items: items.length,
    summary: {
      by_type: countByType,
      by_priority: countByPriority,
    },
    revisions_by_type: Object.entries(grouped).map(([type, revs]) => ({
      type,
      count: revs.length,
      items: revs.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        source: r.source,
      })),
    })),
  };

  void logProjectEvent(
    id,
    'execution_batch_generated',
    `Execution batch generated: ${items.length} items`,
    { batch_label: batchLabel, total_items: items.length, by_type: countByType },
  );

  return NextResponse.json({ batch });
}
