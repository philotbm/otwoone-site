import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MEETING_TYPES, MEETING_STAGES, MEETING_OUTCOMES } from '@/lib/leadStatus';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/hub/leads/[id]/meetings
 * Returns all meetings for a lead, sorted newest first.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('meetings')
    .select('*')
    .eq('lead_id', id)
    .order('scheduled_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ meetings: data });
}

/**
 * POST /api/hub/leads/[id]/meetings
 * Create a new meeting for a lead.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const { type, stage, scheduled_at, notes } = body;

  // Validate required fields
  if (!type || !stage || !scheduled_at) {
    return NextResponse.json(
      { error: 'Missing required fields: type, stage, scheduled_at' },
      { status: 400 },
    );
  }

  // Validate enum values
  if (!(MEETING_TYPES as readonly string[]).includes(type as string)) {
    return NextResponse.json({ error: `Invalid meeting type: ${type}` }, { status: 400 });
  }
  if (!(MEETING_STAGES as readonly string[]).includes(stage as string)) {
    return NextResponse.json({ error: `Invalid meeting stage: ${stage}` }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('meetings')
    .insert({
      lead_id: id,
      type,
      stage,
      scheduled_at,
      notes: notes ?? '',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ meeting: data }, { status: 201 });
}

/**
 * PATCH /api/hub/leads/[id]/meetings
 * Update a meeting (complete it, add outcome, etc).
 * Body must include meeting_id.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const { meeting_id, ...updates } = body;

  if (!meeting_id) {
    return NextResponse.json({ error: 'Missing meeting_id' }, { status: 400 });
  }

  // Allowed fields
  const allowed: Record<string, unknown> = {};
  if ('completed_at' in updates) allowed.completed_at = updates.completed_at;
  if ('outcome' in updates) {
    if (updates.outcome !== null && !(MEETING_OUTCOMES as readonly string[]).includes(updates.outcome as string)) {
      return NextResponse.json({ error: `Invalid outcome: ${updates.outcome}` }, { status: 400 });
    }
    allowed.outcome = updates.outcome;
  }
  if ('next_action_hint' in updates) allowed.next_action_hint = updates.next_action_hint;
  if ('notes' in updates) allowed.notes = updates.notes;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from('meetings')
    .update(allowed)
    .eq('id', meeting_id)
    .eq('lead_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
