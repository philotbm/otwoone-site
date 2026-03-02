import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ token: string }> };

// Reject non-UUID tokens before hitting Postgres (avoids a query-level error).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/projects/[token]/intake/submit
 *
 * Public endpoint — the token acts as the auth credential.
 * Validates that Step 1 + Step 2 are complete, then marks the intake as done.
 *
 * Returns: 200 { ok: true } | 404 | 422 { error } | 500 { error }
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  // ── Token format guard ────────────────────────────────────────────────────

  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

  // ── Load intake row and validate completeness ─────────────────────────────

  const { data: intake, error: intakeErr } = await supabaseServer
    .from('project_intakes')
    .select('step1, step2, completed_at')
    .eq('project_id', project.id)
    .single();

  if (intakeErr || !intake) {
    return NextResponse.json(
      { error: 'Please complete the earlier steps first.' },
      { status: 422 }
    );
  }

  // step1 completeness
  const s1 = (intake.step1 ?? {}) as Record<string, unknown>;
  const s1Ok =
    typeof s1.contact_name === 'string' && s1.contact_name.trim().length >= 2 &&
    typeof s1.project_name === 'string' && s1.project_name.trim().length >= 2 &&
    typeof s1.goals        === 'string' && s1.goals.trim().length >= 10;

  // step2 completeness — mirrors step2 save route validation
  const s2 = (intake.step2 ?? {}) as Record<string, unknown>;
  const rawS2Services = Array.isArray(s2.services) ? s2.services : [];
  const validS2Services = rawS2Services
    .map((s: unknown) => String(s ?? '').trim())
    .filter((s) => s.length >= 2);
  const s2Ok =
    typeof s2.headline    === 'string' && s2.headline.trim().length >= 4 &&
    validS2Services.length >= 3 &&
    validS2Services.length <= 6 &&
    typeof s2.about       === 'string' && s2.about.trim().length >= 40 &&
    typeof s2.primary_cta === 'string' && s2.primary_cta.trim().length > 0;

  if (!s1Ok || !s2Ok) {
    return NextResponse.json(
      { error: 'Please complete the earlier steps first.' },
      { status: 422 }
    );
  }

  // ── Mark intake complete (preserve original completed_at on re-submit) ────

  const now = new Date().toISOString();

  // Only write completed_at if this is the first submission.
  if (!intake.completed_at) {
    const { error: intakeUpdateErr } = await supabaseServer
      .from('project_intakes')
      .update({ completed_at: now })
      .eq('project_id', project.id);

    if (intakeUpdateErr) {
      console.error('[intake/submit] project_intakes update error:', intakeUpdateErr);
      return NextResponse.json(
        { error: 'Failed to submit. Please try again.' },
        { status: 500 }
      );
    }
  }

  // ── Mark project intake status complete ───────────────────────────────────

  const { error: projectUpdateErr } = await supabaseServer
    .from('projects')
    .update({
      intake_status:        'complete',
      intake_last_saved_at: now,
    })
    .eq('id', project.id);

  if (projectUpdateErr) {
    console.error('[intake/submit] projects update error:', projectUpdateErr);
    // Non-fatal: intake is marked complete; just log and continue
  }

  return NextResponse.json({ ok: true });
}
