import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { Webhook } from 'svix';

const INTERESTING_EVENTS = new Set([
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
]);

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    [k: string]: unknown;
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const resendKey     = process.env.RESEND_API_KEY;
  const notifyEmail   = process.env.ELEVATE_NOTIFY_EMAIL;

  if (!webhookSecret) {
    console.error('RESEND_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await req.text();

  const svixId        = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
  }

  let event: ResendEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendEvent;
  } catch (err) {
    console.warn('Resend webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (!INTERESTING_EVENTS.has(event.type)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const recipient = event.data?.to?.[0] ?? 'unknown';
  const subject   = event.data?.subject ?? '';

  if (notifyEmail && recipient === notifyEmail) {
    return NextResponse.json({ ok: true, internal: true });
  }

  if (!resendKey || !notifyEmail) {
    console.warn('Webhook received but RESEND_API_KEY or ELEVATE_NOTIFY_EMAIL missing');
    return NextResponse.json({ ok: true, no_forward: true });
  }

  const action  = event.type.replace('email.', '');
  const emailId = event.data?.email_id ?? '';
  const stamp   = event.created_at ?? new Date().toISOString();

  const fwd = new Resend(resendKey);
  try {
    await fwd.emails.send({
      from:    'OTwoOne <noreply@otwoone.ie>',
      to:      [notifyEmail],
      subject: `Engagement | ${action} | ${recipient} | ${subject}`,
      html: `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;background:#0a0b0f;color:#e5e7eb;padding:24px;">
  <table cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#13141a;border-radius:8px;padding:24px;">
    <tr><td>
      <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6366f1;">Engagement event</p>
      <h2 style="margin:6px 0 16px;font-size:18px;color:#f9fafb;">${escapeHtml(action)} - ${escapeHtml(recipient)}</h2>
      <table cellpadding="6" cellspacing="0" style="font-size:13px;color:#d1d5db;">
        <tr><td style="color:#9ca3af;width:120px;">Event</td><td>${escapeHtml(event.type)}</td></tr>
        <tr><td style="color:#9ca3af;">Recipient</td><td>${escapeHtml(recipient)}</td></tr>
        <tr><td style="color:#9ca3af;">Original subject</td><td>${escapeHtml(subject)}</td></tr>
        <tr><td style="color:#9ca3af;">Email ID</td><td style="font-family:monospace;font-size:11px;">${escapeHtml(emailId)}</td></tr>
        <tr><td style="color:#9ca3af;">Time</td><td>${escapeHtml(stamp)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    });
  } catch (err) {
    console.error('Engagement forward failed:', err);
    return NextResponse.json({ ok: true, forward_failed: true });
  }

  return NextResponse.json({ ok: true });
}
