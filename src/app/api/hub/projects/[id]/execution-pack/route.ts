import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProjectEvent } from '@/lib/projectEvents';

type Params = { params: Promise<{ id: string }> };

type RevisionRow = {
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
 * POST /api/hub/projects/[id]/execution-pack
 *
 * Hub-protected (middleware). Generates a rich execution pack that combines
 * project identity, project context, and active revision items into a single
 * structured payload suitable for prompt generation.
 *
 * Body (optional):
 *   batch_label — filter to a specific batch label
 *
 * Returns { pack: ExecutionPack }
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

  // Fetch project + lead name
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

  // Fetch project context
  const { data: context } = await supabaseServer
    .from('project_context')
    .select('business_summary, project_summary, current_stack, key_urls, constraints, ai_notes, acceptance_notes')
    .eq('project_id', id)
    .maybeSingle();

  // Fetch active revision items
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

  const items = (revisions ?? []) as RevisionRow[];

  // Group by type
  const grouped: Record<string, RevisionRow[]> = {};
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

  const pack = {
    project_id: id,
    project_name: projectName,
    generated_at: new Date().toISOString(),
    batch_label: batchLabel,
    context: {
      business_summary: context?.business_summary ?? null,
      project_summary: context?.project_summary ?? null,
      current_stack: context?.current_stack ?? null,
      key_urls: context?.key_urls ?? null,
      constraints: context?.constraints ?? null,
      ai_notes: context?.ai_notes ?? null,
      acceptance_notes: context?.acceptance_notes ?? null,
    },
    summary: {
      total_items: items.length,
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
    'execution_pack_generated',
    `Execution pack generated: ${items.length} items`,
    { batch_label: batchLabel, total_items: items.length, by_type: countByType, has_context: !!context },
  );

  return NextResponse.json({ pack });
}
