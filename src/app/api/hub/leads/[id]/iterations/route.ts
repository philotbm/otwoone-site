import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/hub/leads/[id]/iterations
 * Returns all iteration entries for a lead, ordered by creation time.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('lead_iterations')
    .select('id, lead_id, source_type, source_date, notes, created_at')
    .eq('lead_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ iterations: data ?? [] });
}

/**
 * POST /api/hub/leads/[id]/iterations
 * Creates a new iteration entry.
 * Body: { source_type: string, source_date?: string, notes: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: { source_type?: string; source_date?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sourceType = body.source_type?.trim();
  const notes = body.notes?.trim();

  if (!sourceType || !['call', 'email', 'document', 'other'].includes(sourceType)) {
    return NextResponse.json({ error: 'source_type must be one of: call, email, document, other' }, { status: 400 });
  }

  if (!notes || notes.length < 5) {
    return NextResponse.json({ error: 'notes must be at least 5 characters.' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('lead_iterations')
    .insert({
      lead_id: id,
      source_type: sourceType,
      source_date: body.source_date || null,
      notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ iteration: data }, { status: 201 });
}
