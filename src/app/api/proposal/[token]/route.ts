import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Params = { params: Promise<{ token: string }> };

/**
 * Client-safe proposal fields — excludes internal operator data.
 */
const CLIENT_SAFE_FIELDS = [
  'id',
  'version_number',
  'status',
  'title',
  'client_name',
  'client_company',
  'prepared_for',
  'prepared_by',
  'proposal_date',
  'valid_until',
  'executive_summary',
  'problem_statement',
  'recommended_solution',
  'scope_items',
  'deliverables',
  'timeline_summary',
  'timeline_phases',
  'build_price',
  'deposit_percent',
  'deposit_amount',
  'balance_amount',
  'balance_terms',
  'running_costs',
  'optional_addons',
  'assumptions',
  'exclusions',
  'next_steps',
  'payment_notes',
  'acceptance_mode',
  'created_at',
  'updated_at',
].join(', ');

/**
 * GET /api/proposal/[token]
 *
 * Public route — loads a proposal by view_token.
 * Returns only client-safe fields. Does not require Hub auth.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Invalid proposal link.' }, { status: 404 });
  }

  const { data, error } = await supabaseServer
    .from('proposals')
    .select(CLIENT_SAFE_FIELDS)
    .eq('view_token', token)
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    console.error('[proposal/token] DB error:', error.message);
    return NextResponse.json({ error: 'Unable to load proposal.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
  }

  return NextResponse.json({ proposal: data });
}
