import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string; revisionId: string }> };

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * GET /api/hub/leads/[id]/revisions/[revisionId]/runs
 *
 * Returns all execution runs for this revision, newest first.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id, revisionId } = await params;

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

  const { data, error } = await supabaseServer
    .from('revision_execution_runs')
    .select('id, revision_id, batch_index, output_report, operator_note, qa_status, qa_notes, created_at')
    .eq('revision_id', revisionId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs: data ?? [] });
}

/**
 * POST /api/hub/leads/[id]/revisions/[revisionId]/runs
 *
 * Save an execution run (pasted OUTPUT REPORT) against a revision batch.
 *
 * Input: { batch_index: number, output_report: string, operator_note?: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id, revisionId } = await params;

  let body: { batch_index?: number; output_report?: string; operator_note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body.batch_index !== 'number' || body.batch_index < 0) {
    return NextResponse.json({ error: 'batch_index is required (non-negative integer).' }, { status: 400 });
  }

  const report = body.output_report?.trim();
  if (!report || report.length < 10) {
    return NextResponse.json({ error: 'output_report is required (minimum 10 characters).' }, { status: 400 });
  }

  // Verify revision belongs to lead and batch_index is valid
  const { data: rev, error: revErr } = await supabaseServer
    .from('lead_revisions')
    .select('id, structured_output')
    .eq('id', revisionId)
    .eq('lead_id', id)
    .single();

  if (revErr || !rev) {
    return NextResponse.json({ error: 'Revision not found.' }, { status: 404 });
  }

  const structured = rev.structured_output as { batches: any[] };
  if (!structured.batches || body.batch_index >= structured.batches.length) {
    return NextResponse.json(
      { error: `batch_index ${body.batch_index} out of range (${structured.batches.length} batches).` },
      { status: 400 },
    );
  }

  // Insert run
  const { data: run, error: insertErr } = await supabaseServer
    .from('revision_execution_runs')
    .insert({
      revision_id: revisionId,
      batch_index: body.batch_index,
      output_report: report,
      operator_note: body.operator_note?.trim() ?? '',
    })
    .select('id, revision_id, batch_index, output_report, operator_note, qa_status, qa_notes, created_at')
    .single();

  if (insertErr) {
    console.error('[runs] Insert failed:', insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ run });
}
