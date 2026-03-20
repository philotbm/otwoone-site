import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string; revisionId: string; runId: string }> };

const VALID_QA_STATUSES = new Set(['pending', 'passed', 'failed']);

/**
 * PATCH /api/hub/leads/[id]/revisions/[revisionId]/runs/[runId]
 *
 * Update QA gate fields on an execution run.
 *
 * Body: { qa_status?: "pending"|"passed"|"failed", qa_notes?: string }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, revisionId, runId } = await params;

  let body: { qa_status?: string; qa_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (body.qa_status !== undefined && !VALID_QA_STATUSES.has(body.qa_status)) {
    return NextResponse.json({ error: `Invalid qa_status: "${body.qa_status}"` }, { status: 400 });
  }
  if (body.qa_notes !== undefined && typeof body.qa_notes !== 'string') {
    return NextResponse.json({ error: 'qa_notes must be a string.' }, { status: 400 });
  }

  // Verify revision belongs to lead
  const { data: rev, error: revErr } = await supabaseServer
    .from('lead_revisions')
    .select('id')
    .eq('id', revisionId)
    .eq('lead_id', id)
    .single();

  if (revErr || !rev) {
    return NextResponse.json({ error: 'Revision not found.' }, { status: 404 });
  }

  // Build update payload
  const updates: Record<string, string> = {};
  if (body.qa_status !== undefined) updates.qa_status = body.qa_status;
  if (body.qa_notes !== undefined) updates.qa_notes = body.qa_notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  const { data: run, error: updateErr } = await supabaseServer
    .from('revision_execution_runs')
    .update(updates)
    .eq('id', runId)
    .eq('revision_id', revisionId)
    .select('id, revision_id, batch_index, output_report, operator_note, qa_status, qa_notes, created_at')
    .single();

  if (updateErr || !run) {
    return NextResponse.json({ error: updateErr?.message ?? 'Run not found.' }, { status: updateErr ? 500 : 404 });
  }

  return NextResponse.json({ run });
}
