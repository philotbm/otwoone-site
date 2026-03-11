import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/hub/leads/[id]/clarifications
 * Returns all clarification rounds for a lead, ordered by round_number.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('lead_clarification_rounds')
    .select('*')
    .eq('lead_id', id)
    .order('round_number', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/hub/leads/[id]/clarifications
 * Creates a new clarification round (auto-increments round_number).
 * Body: { questions?: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as { questions?: string };

  // Determine next round number
  const { data: existing, error: countErr } = await supabaseServer
    .from('lead_clarification_rounds')
    .select('round_number')
    .eq('lead_id', id)
    .order('round_number', { ascending: false })
    .limit(1);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  const nextRound = (existing?.[0]?.round_number ?? 0) + 1;

  const { data, error } = await supabaseServer
    .from('lead_clarification_rounds')
    .insert({
      lead_id: id,
      round_number: nextRound,
      status: 'draft',
      questions: body.questions ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
