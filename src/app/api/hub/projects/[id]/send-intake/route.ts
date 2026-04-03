import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProjectEvent } from '@/lib/projectEvents';

type Params = { params: Promise<{ id: string }> };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://studioflow.ie';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Email template ───────────────────────────────────────────────────────────

function buildPortalEmail(name: string, portalUrl: string, bookingsUrl: string): string {
  const firstName = name.trim().split(' ')[0] || 'there';
  const bookingsBlock = bookingsUrl
    ? `<tr>
        <td style="padding:0 24px 32px;">
          <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">
            Once you&rsquo;re done, you can also book a short kick-off call with us:
          </p>
          <a href="${escapeHtml(bookingsUrl)}" style="color:#6366f1;font-size:14px;text-decoration:none;">
            Book a call &rarr;
          </a>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0b0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr>
      <td style="padding:40px 24px 28px;">
        <img src="https://studioflow.ie/branding/otwoone-logo-wordmark-white.png" alt="StudioFlow" width="140" style="display:block;border:0;height:auto;" />
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 16px;">
        <h1 style="margin:0 0 4px;font-size:22px;font-weight:600;color:#f9fafb;">Your project portal is ready</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 28px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#9ca3af;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#9ca3af;">
          We&rsquo;ve set up your project portal. Please follow the link below and complete the intake form
          so we can hit the ground running — it only takes a few minutes.
        </p>
        <a href="${escapeHtml(portalUrl)}"
           style="display:inline-block;padding:13px 28px;background:#4f46e5;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
          Complete your intake &rarr;
        </a>
      </td>
    </tr>
    ${bookingsBlock}
    <tr>
      <td style="padding:0 24px 40px;border-top:1px solid #1f2937;">
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
          — The StudioFlow team<br>
          <a href="https://studioflow.ie" style="color:#6366f1;text-decoration:none;">studioflow.ie</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * POST /api/hub/projects/[id]/send-intake
 *
 * Protected by hub middleware (proxy.ts) — no explicit auth check needed.
 * Generates intake_token if missing, sends portal link email to client,
 * then transitions intake_status: not_sent → sent.
 *
 * Returns: 200 { ok: true, intake_url } | 404 | 422 { error } | 500 { error }
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  // ── Load project ──────────────────────────────────────────────────────────

  const { data: project, error: projectErr } = await supabaseServer
    .from('projects')
    .select('id, lead_id, intake_token, intake_status, client_contact_name, client_contact_email')
    .eq('id', id)
    .single();

  if (projectErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // ── Resolve client email ──────────────────────────────────────────────────
  // Prefer project.client_contact_email (set after Step 1 save), fall back
  // to the original lead email.

  let contactEmail: string | null = (project.client_contact_email as string | null) ?? null;
  let contactName: string | null  = (project.client_contact_name  as string | null) ?? null;

  if (!contactEmail && project.lead_id) {
    const { data: lead } = await supabaseServer
      .from('leads')
      .select('contact_email, contact_name')
      .eq('id', project.lead_id)
      .single();

    contactEmail = lead?.contact_email ?? null;
    if (!contactName) contactName = lead?.contact_name ?? null;
  }

  if (!contactEmail) {
    return NextResponse.json(
      { error: 'Project has no client email.' },
      { status: 422 }
    );
  }

  // ── Generate intake_token if missing ──────────────────────────────────────

  let intakeToken = (project.intake_token as string | null) ?? null;

  if (!intakeToken) {
    intakeToken = crypto.randomUUID();

    const { error: tokenErr } = await supabaseServer
      .from('projects')
      .update({ intake_token: intakeToken })
      .eq('id', project.id);

    if (tokenErr) {
      console.error('[send-intake] intake_token update error:', tokenErr);
      return NextResponse.json(
        { error: 'Failed to generate portal link. Please try again.' },
        { status: 500 }
      );
    }
  }

  const intake_url = `${SITE_URL}/projects/${intakeToken}`;

  // ── Send email ────────────────────────────────────────────────────────────
  // Do this before updating intake_status so a failed send leaves status
  // unchanged and the hub user can safely retry.

  const resendKey  = process.env.RESEND_API_KEY;
  const bookingsUrl = process.env.NEXT_PUBLIC_BOOKINGS_URL ?? '';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:    'StudioFlow <noreply@studioflow.ie>',
        to:      [contactEmail],
        subject: 'Complete your StudioFlow project intake',
        html:    buildPortalEmail(contactName ?? '', intake_url, bookingsUrl),
      });
    } catch (err) {
      console.error('[send-intake] email send error:', err);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }
  }

  // ── Transition intake_status: not_sent → sent ─────────────────────────────
  // Leave in_progress / complete untouched.

  if (project.intake_status === 'not_sent') {
    const { error: statusErr } = await supabaseServer
      .from('projects')
      .update({ intake_status: 'sent' })
      .eq('id', project.id);

    if (statusErr) {
      console.error('[send-intake] intake_status update error:', statusErr);
      // Non-fatal: email was sent successfully; just log and continue
    }
  }

  await logProjectEvent(project.id, 'portal_link_sent', 'Portal link sent', { to: contactEmail });

  return NextResponse.json({ ok: true, intake_url });
}
