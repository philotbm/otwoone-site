import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { computeScores } from '@/lib/scoring';

// ─── Supabase (service role) ───────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const BUDGET_LABELS: Record<string, string> = {
  under_3k:  'Under €3k',
  '3k_5k':   '€3k–€5k',
  '5k_15k':  '€5k–€15k',
  '15k_40k': '€15k–€40k',
  '40k_plus':'€40k+',
  not_sure:  'Not sure yet',
};

const TIMELINE_LABELS: Record<string, string> = {
  asap:         'As soon as possible',
  '1_3_months': '1–3 months',
  '3_6_months': '3–6 months',
  planning:     'Planning ahead',
};

const ENGAGEMENT_LABELS: Record<string, string> = {
  build_new:       'Build something new',
  improve_existing:'Improve an existing website or system',
  tech_advice:     'Technology advice / strategic guidance',
  branding:        'Branding or design work',
  ongoing_support: 'Ongoing support',
};

const AUTHORITY_LABELS: Record<string, string> = {
  yes:    "Yes — I'm the decision maker",
  shared: 'Shared — need sign-off',
  no:     "No — I'm gathering info",
};

// ─── Internal email ────────────────────────────────────────────────────────────

function buildInternalEmail(params: {
  name: string;
  email: string;
  company: string;
  website: string;
  role: string;
  authority: string;
  engagement_type: string;
  budget: string;
  timeline: string;
  success_definition: string;
  current_tools: string;
  clarifier_answers: Record<string, string>;
  scores: ReturnType<typeof computeScores>;
  lead_id: string;
}): string {
  const {
    name, email, company, website, role, authority,
    engagement_type, budget, timeline, success_definition, current_tools,
    clarifier_answers, scores, lead_id,
  } = params;

  const clarifierRows = Object.entries(clarifier_answers)
    .map(([k, v]) => `
      <tr>
        <td style="padding:6px 16px;color:#9ca3af;font-size:13px;width:160px;vertical-align:top;">${escapeHtml(k.replace(/_/g, ' '))}</td>
        <td style="padding:6px 16px;font-size:13px;">${escapeHtml(v)}</td>
      </tr>`).join('');

  const scoreBar = (score: number) => {
    const filled = '■'.repeat(score);
    const empty  = '□'.repeat(5 - score);
    return `<span style="font-family:monospace;letter-spacing:2px;color:#6366f1;">${filled}</span><span style="font-family:monospace;letter-spacing:2px;color:#374151;">${empty}</span> <span style="color:#9ca3af;">${score}/5</span>`;
  };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://studioflow.ie';
  const hubUrl = `${baseUrl}/hub/leads/${lead_id}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0b0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;">
    <tr>
      <td style="padding:32px 24px 16px;">
        <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6366f1;">StudioFlow · Internal</p>
        <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;color:#f9fafb;">New Elevate Submission</h1>
      </td>
    </tr>

    <tr><td style="padding:0 24px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#13141a;border-radius:8px;overflow:hidden;">
        <tr><td colspan="2" style="padding:10px 16px;background:#1c1d26;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Contact</td></tr>
        <tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;width:140px;">Name</td><td style="padding:8px 16px;font-size:13px;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Email</td><td style="padding:8px 16px;font-size:13px;"><a href="mailto:${escapeHtml(email)}" style="color:#6366f1;text-decoration:none;">${escapeHtml(email)}</a></td></tr>
        ${company ? `<tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Company</td><td style="padding:8px 16px;font-size:13px;">${escapeHtml(company)}</td></tr>` : ''}
        ${website ? `<tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Website</td><td style="padding:8px 16px;font-size:13px;"><a href="${escapeHtml(website)}" style="color:#6366f1;text-decoration:none;">${escapeHtml(website)}</a></td></tr>` : ''}
        ${role ? `<tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Role</td><td style="padding:8px 16px;font-size:13px;">${escapeHtml(role)}</td></tr>` : ''}
        <tr><td style="padding:8px 16px 14px;color:#9ca3af;font-size:13px;">Authority</td><td style="padding:8px 16px 14px;font-size:13px;">${escapeHtml(AUTHORITY_LABELS[authority] ?? authority)}</td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 24px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#13141a;border-radius:8px;overflow:hidden;">
        <tr><td colspan="2" style="padding:10px 16px;background:#1c1d26;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Engagement</td></tr>
        <tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;width:140px;">Type</td><td style="padding:8px 16px;font-size:13px;">${escapeHtml(ENGAGEMENT_LABELS[engagement_type] ?? engagement_type)}</td></tr>
        <tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Budget</td><td style="padding:8px 16px;font-size:13px;">${escapeHtml(BUDGET_LABELS[budget] ?? budget)}</td></tr>
        <tr><td style="padding:8px 16px 14px;color:#9ca3af;font-size:13px;">Timeline</td><td style="padding:8px 16px 14px;font-size:13px;">${escapeHtml(TIMELINE_LABELS[timeline] ?? timeline)}</td></tr>
      </table>
    </td></tr>

    ${clarifierRows ? `<tr><td style="padding:0 24px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#13141a;border-radius:8px;overflow:hidden;">
        <tr><td colspan="2" style="padding:10px 16px;background:#1c1d26;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Clarifier Answers</td></tr>
        ${clarifierRows}
        <tr><td colspan="2" style="padding:6px;"></td></tr>
      </table>
    </td></tr>` : ''}

    ${success_definition ? `<tr><td style="padding:0 24px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#13141a;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 16px;background:#1c1d26;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Client Request</td></tr>
        <tr><td style="padding:14px 16px;font-size:13px;line-height:1.7;color:#d1d5db;">${escapeHtml(success_definition)}</td></tr>
      </table>
    </td></tr>` : ''}

    ${current_tools ? `<tr><td style="padding:0 24px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#13141a;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 16px;background:#1c1d26;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Current Tools</td></tr>
        <tr><td style="padding:14px 16px;font-size:13px;line-height:1.7;color:#d1d5db;">${escapeHtml(current_tools)}</td></tr>
      </table>
    </td></tr>` : ''}

    <tr><td style="padding:0 24px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#13141a;border-radius:8px;overflow:hidden;">
        <tr><td colspan="2" style="padding:10px 16px;background:#1c1d26;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;">Internal Scoring</td></tr>
        <tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;width:160px;">Clarity</td><td style="padding:8px 16px;font-size:13px;">${scoreBar(scores.clarity_score)}</td></tr>
        <tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Alignment</td><td style="padding:8px 16px;font-size:13px;">${scoreBar(scores.alignment_score)}</td></tr>
        <tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Complexity</td><td style="padding:8px 16px;font-size:13px;">${scoreBar(scores.complexity_score)}</td></tr>
        <tr><td style="padding:8px 16px;color:#9ca3af;font-size:13px;">Authority</td><td style="padding:8px 16px;font-size:13px;">${scoreBar(scores.authority_score)}</td></tr>
        <tr><td style="padding:10px 16px;color:#9ca3af;font-size:13px;border-top:1px solid #1f2028;">Total</td><td style="padding:10px 16px;font-size:16px;font-weight:600;color:#f9fafb;border-top:1px solid #1f2028;">${scores.total_score}/5</td></tr>
        <tr><td style="padding:4px 16px 14px;color:#9ca3af;font-size:13px;">Discovery rec.</td><td style="padding:4px 16px 14px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6366f1;">${scores.discovery_depth_suggested}</td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 24px 40px;text-align:center;">
      <a href="${escapeHtml(hubUrl)}" style="display:inline-block;padding:12px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">View in Hub →</a>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Client confirmation email ─────────────────────────────────────────────────

function buildClientEmail(name: string): string {
  const firstName = (name ?? '').trim().split(' ')[0] || 'there';
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
      <td style="padding:0 24px 28px;">
        <h1 style="margin:0 0 4px;font-size:22px;font-weight:600;color:#f9fafb;">We've received your details</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 40px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#9ca3af;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#9ca3af;">Thanks for reaching out. We've received your submission and will be in touch within 1–2 business days.</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#9ca3af;">If you have anything to add in the meantime, just reply to this email.</p>
        <p style="margin:32px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">— The StudioFlow team<br><a href="https://studioflow.ie" style="color:#6366f1;text-decoration:none;">studioflow.ie</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    const contact_name       = String(body.contact_name ?? '').trim() || null;
    const contact_email      = String(body.contact_email ?? '').trim();
    const company_name       = String(body.company_name ?? '').trim() || null;
    const company_website    = String(body.company_website ?? '').trim() || null;
    const role               = String(body.role ?? '').trim() || null;
    const decision_authority = String(body.decision_authority ?? '').trim() || null;
    const engagement_type    = String(body.engagement_type ?? '').trim() || null;
    const budget             = String(body.budget ?? '').trim() || null;
    const timeline           = String(body.timeline ?? '').trim() || null;
    const success_definition = String(body.success_definition ?? '').trim() || null;
    const current_tools      = String(body.current_tools ?? '').trim() || null;
    const clarifier_answers  = (body.clarifier_answers ?? {}) as Record<string, string>;

    if (!contact_email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!success_definition || success_definition.length < 25) {
      return NextResponse.json({ error: 'Description must be at least 25 characters' }, { status: 400 });
    }

    // ── Score ────────────────────────────────────────────────────────────────
    const scores = computeScores({
      engagement_type: engagement_type ?? '',
      budget:          budget ?? '',
      timeline:        timeline ?? '',
      decision_authority: decision_authority ?? '',
      clarifier_answers,
      success_definition: success_definition ?? '',
    });

    const supabase = getSupabase();

    // ── Insert lead ──────────────────────────────────────────────────────────
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        source:            'elevate',
        status:            'enquiry_received',
        contact_name,
        contact_email,
        company_name,
        company_website,
        role,
        decision_authority,
        engagement_type,
        budget,
        timeline,
        clarity_score:              scores.clarity_score,
        alignment_score:            scores.alignment_score,
        complexity_score:           scores.complexity_score,
        authority_score:            scores.authority_score,
        total_score:                scores.total_score,
        discovery_depth_suggested:  scores.discovery_depth_suggested,
      })
      .select('id')
      .single();

    if (leadErr || !lead) {
      console.error('Lead insert error:', leadErr);
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    }

    // ── Insert lead_details ──────────────────────────────────────────────────
    const rawSubmission = {
      contact_name, contact_email, company_name, company_website,
      role, decision_authority, engagement_type, budget, timeline,
      success_definition, current_tools, clarifier_answers,
    };

    await supabase.from('lead_details').insert({
      lead_id:            lead.id,
      raw_submission:     rawSubmission,
      clarifier_answers,
      success_definition,
      current_tools,
      internal_notes:     null,
    });

    // ── Emails (non-blocking) ────────────────────────────────────────────────
    const emailResult: { attempted: boolean; sent: boolean; error?: string } = {
      attempted: false,
      sent: false,
    };

    const resendKey   = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.ELEVATE_NOTIFY_EMAIL;

    if (resendKey && notifyEmail) {
      emailResult.attempted = true;
      try {
        const resend = new Resend(resendKey);

        await Promise.all([
          resend.emails.send({
            from:    'StudioFlow <noreply@studioflow.ie>',
            to:      [notifyEmail],
            subject: `Elevate · ${contact_name || contact_email} · ${ENGAGEMENT_LABELS[engagement_type ?? ''] ?? engagement_type}`,
            html:    buildInternalEmail({
              name:               contact_name ?? '',
              email:              contact_email,
              company:            company_name ?? '',
              website:            company_website ?? '',
              role:               role ?? '',
              authority:          decision_authority ?? '',
              engagement_type:    engagement_type ?? '',
              budget:             budget ?? '',
              timeline:           timeline ?? '',
              success_definition: success_definition ?? '',
              current_tools:      current_tools ?? '',
              clarifier_answers,
              scores,
              lead_id:            lead.id,
            }),
          }),
          resend.emails.send({
            from:    'StudioFlow <noreply@studioflow.ie>',
            to:      [contact_email],
            replyTo: notifyEmail,
            subject: "We've received your details",
            html:    buildClientEmail(contact_name ?? ''),
          }),
        ]);

        emailResult.sent = true;
      } catch (err) {
        emailResult.error = err instanceof Error ? err.message : String(err);
        console.error('Email error:', emailResult.error);
      }
    }

    return NextResponse.json({ success: true, id: lead.id, email: emailResult });
  } catch (err) {
    console.error('Submit error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
