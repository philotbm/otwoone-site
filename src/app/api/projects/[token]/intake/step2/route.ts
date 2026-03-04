import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProjectEvent } from '@/lib/projectEvents';

type Params = { params: Promise<{ token: string }> };

// Reject non-UUID tokens before hitting Postgres (avoids a query-level error).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_CTA = ['call', 'email', 'contact_form', 'whatsapp'] as const;
type PrimaryCta = (typeof VALID_CTA)[number];

/**
 * POST /api/projects/[token]/intake/step2
 *
 * Public endpoint — the token acts as the auth credential.
 * Persists Step 2 (Project details) for a client portal session.
 *
 * Body: { headline, subheadline?, services, about, primary_cta }
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

  const headline    = String(body.headline    ?? '').trim();
  const subheadline = String(body.subheadline ?? '').trim();
  const about       = String(body.about       ?? '').trim();
  const primary_cta = String(body.primary_cta ?? '').trim();

  // Services: must be an array; filter to non-empty strings after trimming
  const rawServices = Array.isArray(body.services) ? body.services : [];
  const services = rawServices
    .map((s: unknown) => String(s ?? '').trim())
    .filter((s) => s.length > 0);

  // ── Validate ─────────────────────────────────────────────────────────────

  if (headline.length < 4) {
    return NextResponse.json(
      { error: 'Please enter a headline (at least 4 characters).' },
      { status: 422 }
    );
  }

  const validServices = services.filter((s) => s.length >= 2);
  if (validServices.length < 3) {
    return NextResponse.json(
      { error: 'Please enter at least 3 services (each at least 2 characters).' },
      { status: 422 }
    );
  }
  if (validServices.length > 6) {
    return NextResponse.json(
      { error: 'Please enter no more than 6 services.' },
      { status: 422 }
    );
  }

  if (about.length < 40) {
    return NextResponse.json(
      { error: 'Please tell us a bit more about your business (at least 40 characters).' },
      { status: 422 }
    );
  }

  if (!VALID_CTA.includes(primary_cta as PrimaryCta)) {
    return NextResponse.json(
      { error: 'Please select a primary call-to-action.' },
      { status: 422 }
    );
  }

  // ── Resolve project from token ────────────────────────────────────────────

  const { data: project, error: findErr } = await supabaseServer
    .from('projects')
    .select('id')
    .eq('intake_token', token)
    .single();

  if (findErr || !project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ── Upsert project_intakes (step2 only; step1/step3 untouched on conflict) ─

  const { error: upsertErr } = await supabaseServer
    .from('project_intakes')
    .upsert(
      {
        project_id: project.id,
        step2: { headline, subheadline, services: validServices, about, primary_cta },
      },
      { onConflict: 'project_id' }
    );

  if (upsertErr) {
    console.error('[intake/step2] project_intakes upsert error:', upsertErr);
    return NextResponse.json({ error: 'Failed to save your details. Please try again.' }, { status: 500 });
  }

  // ── Update project intake tracking columns ────────────────────────────────

  const { error: updateErr } = await supabaseServer
    .from('projects')
    .update({
      intake_last_saved_at: new Date().toISOString(),
    })
    .eq('id', project.id);

  if (updateErr) {
    console.error('[intake/step2] projects update error:', updateErr);
    // Non-fatal: intake data is saved; just log and continue
  }

  await logProjectEvent(project.id, 'scope_saved', 'Scope saved', { step: 2 });

  return NextResponse.json({ ok: true });
}
