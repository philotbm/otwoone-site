import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProposalEvent } from '@/lib/proposalEvents';

type Params = { params: Promise<{ token: string }> };

/**
 * POST /api/proposal/[token]/approve
 *
 * Public client-safe approval endpoint.
 * Records who approved, when, and transitions proposal status to "approved".
 * Also advances the linked lead to "deposit_requested" if currently at "proposal_sent".
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid proposal link.' }, { status: 404 });
  }

  // Parse and validate body
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
  }
  if (!company) {
    return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
  }

  // Load proposal by view_token
  const { data: proposal, error: loadError } = await supabaseServer
    .from('proposals')
    .select('id, lead_id, status, approved_at, terms_version')
    .eq('view_token', token)
    .eq('is_current', true)
    .maybeSingle();

  if (loadError) {
    console.error('[proposal/approve] DB error:', loadError.message);
    return NextResponse.json({ error: 'Unable to process approval.' }, { status: 500 });
  }

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
  }

  // Prevent duplicate approval — if already approved, return success idempotently
  if (proposal.approved_at) {
    return NextResponse.json({
      success: true,
      already_approved: true,
      message: 'This proposal has already been approved.',
    });
  }

  // Only allow approval from certain states
  const approvableStatuses = ['draft', 'ready', 'sent', 'viewed'];
  if (!approvableStatuses.includes(proposal.status)) {
    return NextResponse.json(
      { error: `Proposal cannot be approved in its current state (${proposal.status}).` },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  // Record approval
  const { error: updateError } = await supabaseServer
    .from('proposals')
    .update({
      status: 'approved',
      approved_by_name: name,
      approved_by_company: company,
      approved_at: now,
    })
    .eq('id', proposal.id);

  if (updateError) {
    console.error('[proposal/approve] Update error:', updateError.message);
    return NextResponse.json({ error: 'Failed to record approval.' }, { status: 500 });
  }

  // Log proposal event (best-effort)
  void logProposalEvent(proposal.id, 'approved', `Proposal approved by ${name} (${company})`, {
    approved_by_name: name,
    approved_by_company: company,
    terms_version: proposal.terms_version,
    user_agent: req.headers.get('user-agent') ?? null,
  });

  // Advance lead status to deposit_requested if currently at proposal_sent
  if (proposal.lead_id) {
    const { data: lead } = await supabaseServer
      .from('leads')
      .select('status')
      .eq('id', proposal.lead_id)
      .maybeSingle();

    if (lead && lead.status === 'proposal_sent') {
      const { error: leadError } = await supabaseServer
        .from('leads')
        .update({ status: 'deposit_requested' })
        .eq('id', proposal.lead_id);

      if (leadError) {
        console.error('[proposal/approve] Lead status update error:', leadError.message);
        // Non-fatal — approval is already recorded
      }
    }
  }

  return NextResponse.json({
    success: true,
    approved_at: now,
    message: 'Proposal approved successfully.',
  });
}
