import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ token: string }> };

// Reject non-UUID tokens before hitting Postgres (avoids a query-level error).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/projects/[token]/intake
 *
 * Public endpoint — the token acts as the auth credential.
 * Persists Step 1 (Basics) for a client portal session.
 *
 * Body: { contact_name, project_name, goals }
 * Returns: 200 { ok: true } | 404 | 422 { error } | 500 { error }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;

  // ── Token format guard ────────────────────────────────────────────────────

  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ── Parse body ───────────────────────────────────────────────────────────

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const contact_name = String(body.contact_name ?? '').trim();
  const project_name = String(body.project_name ?? '').trim();
  const goals        = String(body.goals        ?? '').trim();

  // ── Validate ─────────────────────────────────────────────────────────────

  if (contact_name.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name (at least 2 characters).' }, { status: 422 });
  }
  if (project_name.length < 2) {
    return NextResponse.json({ error: 'Please enter a project name (at least 2 characters).' }, { status: 422 });
  }
  if (goals.length < 10) {
    return NextResponse.json({ error: 'Please describe your goals in a little more detail (at least 10 characters).' }, { status: 422 });
  }

  // ── Resolve project from token ────────────────────────────────────────────

  const { data: project, error: findErr } = await supabaseServer
    .from('projects')
    .select('id')
    .eq('intake_token', token)
    .single();

  if (findErr || !project) {
    // PGRST116 = no rows; treat all find errors as 404 (don't leak info)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ── Upsert project_intakes (step1 only; step2/step3 untouched on conflict) ─

  const { error: upsertErr } = await supabaseServer
    .from('project_intakes')
    .upsert(
      { project_id: project.id, step1: { contact_name, project_name, goals } },
      { onConflict: 'project_id' }
    );

  if (upsertErr) {
    console.error('[intake] project_intakes upsert error:', upsertErr);
    return NextResponse.json({ error: 'Failed to save your details. Please try again.' }, { status: 500 });
  }

  // ── Update project intake tracking columns ────────────────────────────────

  const { error: updateErr } = await supabaseServer
    .from('projects')
    .update({
      intake_status:        'in_progress',
      intake_last_saved_at: new Date().toISOString(),
      client_contact_name:  contact_name,
    })
    .eq('id', project.id);

  if (updateErr) {
    console.error('[intake] projects update error:', updateErr);
    // Non-fatal: intake data is saved; just log and continue
    // (don't fail the client request over a status field)
  }

  return NextResponse.json({ ok: true });
}
