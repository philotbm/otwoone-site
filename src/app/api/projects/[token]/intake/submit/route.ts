import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ token: string }> };

// Reject non-UUID tokens before hitting Postgres (avoids a query-level error).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.otwoone.ie';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Internal notification email ──────────────────────────────────────────────

function buildNotifyEmail(opts: {
  contact_name:  string;
  project_name:  string;
  goals:         string;
  headline:      string;
  services:      string[];
  primary_cta:   string;
  hub_url:       string;
}): string {
  const servicesHtml = opts.services
    .map((s) => `<li style="margin:0 0 4px;">${escapeHtml(s)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0b0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr>
      <td style="padding:32px 24px 20px;">
        <img src="https://www.otwoone.ie/branding/otwoone-logo-wordmark-white.png" alt="OTwoOne" width="120" style="display:block;border:0;height:auto;" />
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;">
        <h1 style="margin:0 0 6px;font-size:20px;font-weight:600;color:#f9fafb;">
          Project intake submitted
        </h1>
        <p style="margin:0;font-size:13px;color:#6b7280;">
          ${escapeHtml(opts.contact_name)} has completed their intake for
          <strong style="color:#e5e7eb;">${escapeHtml(opts.project_name)}</strong>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#111318;border:1px solid #1f2937;border-radius:10px;">
          <tr>
            <td style="padding:20px 20px 4px;">
              <p style="margin:0 0 14px;font-size:13px;">
                <span style="color:#6b7280;display:inline-block;width:110px;">Contact</span>
                <span style="color:#e5e7eb;">${escapeHtml(opts.contact_name)}</span>
              </p>
              <p style="margin:0 0 14px;font-size:13px;">
                <span style="color:#6b7280;display:inline-block;width:110px;">Project</span>
                <span style="color:#e5e7eb;">${escapeHtml(opts.project_name)}</span>
              </p>
              <p style="margin:0 0 14px;font-size:13px;">
                <span style="color:#6b7280;display:inline-block;width:110px;vertical-align:top;">Goals</span>
                <span style="color:#e5e7eb;">${escapeHtml(opts.goals)}</span>
              </p>
              <p style="margin:0 0 14px;font-size:13px;">
                <span style="color:#6b7280;display:inline-block;width:110px;">Headline</span>
                <span style="color:#e5e7eb;">${escapeHtml(opts.headline)}</span>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Services</p>
              <ul style="margin:0 0 14px;padding-left:18px;font-size:13px;color:#e5e7eb;">
                ${servicesHtml}
              </ul>
              <p style="margin:0 0 20px;font-size:13px;">
                <span style="color:#6b7280;display:inline-block;width:110px;">Primary CTA</span>
                <span style="color:#e5e7eb;">${escapeHtml(opts.primary_cta)}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 36px;">
        <a href="${escapeHtml(opts.hub_url)}"
           style="display:inline-block;padding:11px 24px;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          View in Hub &rarr;
        </a>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

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
    .select('id, lead_id')
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

  // Capture before the write — used below to gate the notification email.
  const isFirstSubmission = !intake.completed_at;

  if (isFirstSubmission) {
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

  // ── Internal notification email (first submission only) ───────────────────
  // Uses ELEVATE_NOTIFY_EMAIL — same inbox, no new env var needed.
  // Non-blocking: failure is logged but does not affect the client response.

  if (isFirstSubmission) {
    const resendKey   = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.ELEVATE_NOTIFY_EMAIL;

    if (resendKey && notifyEmail) {
      const hubUrl = project.lead_id
        ? `${SITE_URL}/hub/leads/${project.lead_id}`
        : `${SITE_URL}/hub`;

      void (async () => {
        try {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from:    'OTwoOne <noreply@otwoone.ie>',
            to:      [notifyEmail],
            subject: `Project intake submitted — ${String(s1.project_name ?? '').trim()}`,
            html:    buildNotifyEmail({
              contact_name: String(s1.contact_name ?? '').trim(),
              project_name: String(s1.project_name ?? '').trim(),
              goals:        String(s1.goals        ?? '').trim(),
              headline:     String(s2.headline     ?? '').trim(),
              services:     validS2Services,
              primary_cta:  String(s2.primary_cta  ?? '').trim(),
              hub_url:      hubUrl,
            }),
          });
        } catch (err) {
          console.error('[intake/submit] notification email error:', err);
        }
      })();
    }
  }

  return NextResponse.json({ ok: true });
}
