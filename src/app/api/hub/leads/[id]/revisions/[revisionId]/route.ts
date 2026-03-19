import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string; revisionId: string }> };

const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);
const VALID_EFFORTS = new Set(['small', 'medium', 'large']);
const VALID_STATUSES = new Set(['pending', 'ready', 'in_progress', 'complete']);

type BatchUpdate = {
  batch_index: number;
  priority?: string;
  effort?: string;
  status?: string;
  operator_note?: string;
};

/**
 * PATCH /api/hub/leads/[id]/revisions/[revisionId]
 *
 * Updates triage metadata on a single batch within a revision's structured_output.
 *
 * Body: {
 *   batch_index: number,
 *   priority?: "high" | "medium" | "low",
 *   effort?: "small" | "medium" | "large",
 *   status?: "pending" | "ready" | "in_progress" | "complete",
 *   operator_note?: string
 * }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, revisionId } = await params;

  let body: BatchUpdate;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body.batch_index !== 'number' || body.batch_index < 0) {
    return NextResponse.json({ error: 'batch_index is required (non-negative integer).' }, { status: 400 });
  }

  // Validate enums
  if (body.priority !== undefined && !VALID_PRIORITIES.has(body.priority)) {
    return NextResponse.json({ error: `Invalid priority: "${body.priority}"` }, { status: 400 });
  }
  if (body.effort !== undefined && !VALID_EFFORTS.has(body.effort)) {
    return NextResponse.json({ error: `Invalid effort: "${body.effort}"` }, { status: 400 });
  }
  if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: `Invalid status: "${body.status}"` }, { status: 400 });
  }
  if (body.operator_note !== undefined && typeof body.operator_note !== 'string') {
    return NextResponse.json({ error: 'operator_note must be a string.' }, { status: 400 });
  }

  // Load current revision
  const { data: revision, error: loadErr } = await supabaseServer
    .from('lead_revisions')
    .select('id, lead_id, raw_feedback, structured_output, created_at, updated_at')
    .eq('id', revisionId)
    .eq('lead_id', id)
    .single();

  if (loadErr || !revision) {
    return NextResponse.json({ error: 'Revision not found.' }, { status: 404 });
  }

  const structured = revision.structured_output as { batches: Record<string, unknown>[] };
  if (!structured.batches || body.batch_index >= structured.batches.length) {
    return NextResponse.json({ error: `batch_index ${body.batch_index} out of range (${structured.batches.length} batches).` }, { status: 400 });
  }

  // Apply updates to the target batch
  const batch = structured.batches[body.batch_index];
  if (body.priority !== undefined) batch.priority = body.priority;
  if (body.effort !== undefined) batch.effort = body.effort;
  if (body.status !== undefined) batch.status = body.status;
  if (body.operator_note !== undefined) batch.operator_note = body.operator_note;

  // Persist
  const { data: updated, error: updateErr } = await supabaseServer
    .from('lead_revisions')
    .update({ structured_output: structured })
    .eq('id', revisionId)
    .select('id, lead_id, raw_feedback, structured_output, created_at, updated_at')
    .single();

  if (updateErr) {
    console.error('[revisions] PATCH failed:', updateErr.message);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ revision: updated });
}
