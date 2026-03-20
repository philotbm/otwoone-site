import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ token: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/projects/[token]/progress
 *
 * Public endpoint — the project intake_token acts as the auth credential.
 * Returns a client-safe, read-only view of project progress:
 *   - Revision batches with status only (no internal notes, no pricing)
 *   - Latest QA-passed execution run per batch (title + summary + timestamp)
 *   - "What's next" — batches in ready or in_progress state
 *
 * Excludes: failed runs, operator notes, pricing, research, complexity.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Resolve project → lead_id
  const { data: project, error: projErr } = await supabaseServer
    .from('projects')
    .select('id, lead_id')
    .eq('intake_token', token)
    .maybeSingle();

  if (projErr || !project || !project.lead_id) {
    return NextResponse.json({ progress: null });
  }

  const leadId = project.lead_id;

  // Load revisions for this lead (newest first)
  const { data: revisions } = await supabaseServer
    .from('lead_revisions')
    .select('id, structured_output, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (!revisions || revisions.length === 0) {
    return NextResponse.json({ progress: null });
  }

  // Load all execution runs for these revisions
  const revisionIds = revisions.map((r) => r.id);
  const { data: runs } = await supabaseServer
    .from('revision_execution_runs')
    .select('id, revision_id, batch_index, output_report, qa_status, created_at')
    .in('revision_id', revisionIds)
    .eq('qa_status', 'passed')
    .order('created_at', { ascending: false });

  // Build client-facing progress
  type ClientBatch = {
    title: string;
    status: string;
    priority: string;
    completedWork?: {
      summary: string;
      completedAt: string;
    };
  };

  const allBatches: ClientBatch[] = [];
  const upNext: string[] = [];

  for (const rev of revisions) {
    const structured = rev.structured_output as { batches: any[] };
    if (!structured?.batches) continue;

    for (let bi = 0; bi < structured.batches.length; bi++) {
      const batch = structured.batches[bi];
      const status = batch.status ?? 'pending';
      const title = batch.title ?? 'Untitled';

      const clientBatch: ClientBatch = {
        title,
        status,
        priority: batch.priority ?? 'medium',
      };

      // Find latest QA-passed run for this batch
      const passedRun = (runs ?? []).find(
        (r) => r.revision_id === rev.id && r.batch_index === bi,
      );

      if (passedRun) {
        // Extract first ~3 lines as summary
        const lines = (passedRun.output_report || '').split('\n').filter((l: string) => l.trim());
        const summary = lines.slice(0, 3).join('\n');
        clientBatch.completedWork = {
          summary,
          completedAt: passedRun.created_at,
        };
      }

      allBatches.push(clientBatch);

      if (status === 'ready' || status === 'in_progress') {
        upNext.push(title);
      }
    }
  }

  return NextResponse.json({
    progress: {
      batches: allBatches,
      upNext,
      totalBatches: allBatches.length,
      completedBatches: allBatches.filter((b) => b.status === 'complete').length,
    },
  });
}
