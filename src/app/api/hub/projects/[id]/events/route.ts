import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/hub/projects/[id]/events
 *
 * Hub-protected (middleware). Returns the 50 most recent project events,
 * newest first.
 *
 * Returns { events: ProjectEvent[] }
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('project_events')
    .select('id, event_type, message, meta, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

/**
 * POST /api/hub/projects/[id]/events
 *
 * Hub-protected (middleware). Appends a single event to the audit trail.
 * Used by client components that cannot call the server-side logProjectEvent helper.
 *
 * Body: { event_type: string, message: string, meta?: object }
 * Returns { ok: true } | { error }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const event_type = String(body.event_type ?? '').trim();
  const message    = String(body.message    ?? '').trim();

  if (!event_type || !message) {
    return NextResponse.json({ error: 'event_type and message are required' }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from('project_events')
    .insert({
      project_id: id,
      event_type,
      message,
      meta: body.meta ?? null,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
