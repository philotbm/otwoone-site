import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string; roundId: string }> };

const ALLOWED_FIELDS = [
  'status', 'questions', 'client_reply', 'generated_email',
] as const;

const VALID_STATUSES = ['draft', 'sent', 'replied', 'closed'] as const;

/**
 * PATCH /api/hub/leads/[id]/clarifications/[roundId]
 * Updates a single clarification round.
 * Allowed fields: status, questions, client_reply, generated_email
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, roundId } = await params;
  const body = await req.json() as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided.' }, { status: 400 });
  }

  // Validate status if provided
  if ('status' in updates) {
    if (!VALID_STATUSES.includes(updates.status as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
  }

  const { data, error } = await supabaseServer
    .from('lead_clarification_rounds')
    .update(updates)
    .eq('id', roundId)
    .eq('lead_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/hub/leads/[id]/clarifications/[roundId]
 * Deletes a clarification round (only if still in draft status).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, roundId } = await params;

  // Only allow deleting draft rounds
  const { data: round, error: fetchErr } = await supabaseServer
    .from('lead_clarification_rounds')
    .select('status')
    .eq('id', roundId)
    .eq('lead_id', id)
    .single();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: fetchErr.code === 'PGRST116' ? 404 : 500 });
  }

  if (round.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft rounds can be deleted.' }, { status: 409 });
  }

  const { error } = await supabaseServer
    .from('lead_clarification_rounds')
    .delete()
    .eq('id', roundId)
    .eq('lead_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
