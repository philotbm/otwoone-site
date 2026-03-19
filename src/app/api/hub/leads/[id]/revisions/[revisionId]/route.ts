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
  objective?: string;
  implementation_notes?: string;
  open_questions?: string[];
  acceptance_criteria?: string[];
};

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every((v) => typeof v === 'string');
}

/**
 * PATCH /api/hub/leads/[id]/revisions/[revisionId]
 *
 * Updates triage + execution brief metadata on a single batch.
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
  // Validate strings
  if (body.operator_note !== undefined && typeof body.operator_note !== 'string') {
    return NextResponse.json({ error: 'operator_note must be a string.' }, { status: 400 });
  }
  if (body.objective !== undefined && typeof body.objective !== 'string') {
    return NextResponse.json({ error: 'objective must be a string.' }, { status: 400 });
  }
  if (body.implementation_notes !== undefined && typeof body.implementation_notes !== 'string') {
    return NextResponse.json({ error: 'implementation_notes must be a string.' }, { status: 400 });
  }
  // Validate arrays
  if (body.open_questions !== undefined && !isStringArray(body.open_questions)) {
    return NextResponse.json({ error: 'open_questions must be an array of strings.' }, { status: 400 });
  }
  if (body.acceptance_criteria !== undefined && !isStringArray(body.acceptance_criteria)) {
    return NextResponse.json({ error: 'acceptance_criteria must be an array of strings.' }, { status: 400 });
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
  if (body.objective !== undefined) batch.objective = body.objective;
  if (body.implementation_notes !== undefined) batch.implementation_notes = body.implementation_notes;
  if (body.open_questions !== undefined) batch.open_questions = body.open_questions;
  if (body.acceptance_criteria !== undefined) batch.acceptance_criteria = body.acceptance_criteria;

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
