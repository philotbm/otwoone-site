import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { logProposalEvent } from '@/lib/proposalEvents';
import { assembleProposalSources } from '@/lib/proposalSourceAssembly';
import type { Proposal, ProposalStatus } from '@/lib/proposalTypes';

type Params = { params: Promise<{ id: string }> };

// Fields that can be updated via PATCH
const ALLOWED_TEXT_FIELDS = [
  'title',
  'client_name',
  'client_company',
  'prepared_for',
  'prepared_by',
  'executive_summary',
  'problem_statement',
  'recommended_solution',
  'timeline_summary',
  'balance_terms',
  'payment_notes',
  'acceptance_mode',
] as const;

const ALLOWED_JSON_FIELDS = [
  'scope_items',
  'deliverables',
  'timeline_phases',
  'running_costs',
  'optional_addons',
  'assumptions',
  'exclusions',
  'next_steps',
] as const;

const ALLOWED_NUMERIC_FIELDS = [
  'build_price',
  'deposit_percent',
  'deposit_amount',
  'balance_amount',
] as const;

const ALLOWED_DATE_FIELDS = [
  'proposal_date',
  'valid_until',
] as const;

const ALLOWED_STATUSES: ProposalStatus[] = [
  'draft', 'ready', 'sent', 'viewed', 'approved',
  'signed', 'deposit_requested', 'deposit_received', 'superseded',
];

/**
 * GET /api/hub/leads/[id]/proposal
 *
 * Returns the current proposal for this lead, or { proposal: null }.
 * Includes assembled source readiness when requested with ?sources=1.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const includeSources = req.nextUrl.searchParams.get('sources') === '1';

  const { data, error } = await supabaseServer
    .from('proposals')
    .select('*')
    .eq('lead_id', id)
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: Record<string, unknown> = { proposal: data };

  // Optionally include source assembly for the workspace
  if (includeSources) {
    const sources = await assembleProposalSources(id);
    if ('error' in sources) {
      result.sources = null;
      result.sources_error = sources.error;
    } else {
      result.sources = sources;
    }
  }

  return NextResponse.json(result);
}

/**
 * POST /api/hub/leads/[id]/proposal
 *
 * Creates the initial proposal for this lead. Idempotent — returns existing
 * current proposal if one already exists.
 *
 * Accepts optional body with initial field values.
 * Automatically populates identity fields from lead data if not provided.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  // Check for existing current proposal
  const { data: existing } = await supabaseServer
    .from('proposals')
    .select('*')
    .eq('lead_id', id)
    .eq('is_current', true)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ proposal: existing });
  }

  // Parse optional body
  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    // empty body is fine
  }

  // Assemble source data for defaults
  const pricingInput = body.build_pricing as Proposal['build_price'] extends number ? { recommended_build_days: number; recommended_build_price: number; day_rate: number; confidence_range_low: number; confidence_range_high: number; client_budget_low: number | null; client_budget_high: number | null; commercial_strategy: string } : null ?? null;
  const costsInput = body.running_costs_input as { items: Array<{ name: string; low: number; high: number; relevance: string }>; support_retainer: number; total_low: number; total_high: number; total_with_retainer_low: number; total_with_retainer_high: number } | null ?? null;

  const sourcesResult = await assembleProposalSources(id, pricingInput, costsInput);
  if ('error' in sourcesResult) {
    return NextResponse.json({ error: sourcesResult.error }, { status: 404 });
  }
  const sources = sourcesResult;

  // Build insert record with defaults from source assembly
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  const viewToken = randomBytes(24).toString('base64url');

  const insert: Record<string, unknown> = {
    lead_id: id,
    version_number: 1,
    is_current: true,
    status: 'draft',
    view_token: viewToken,

    // Identity defaults from lead
    title: body.title ?? `Proposal for ${sources.company_name || sources.contact_name || 'Client'}`,
    client_name: body.client_name ?? sources.contact_name,
    client_company: body.client_company ?? sources.company_name,
    prepared_for: body.prepared_for ?? sources.contact_name,
    prepared_by: body.prepared_by ?? 'OTwoOne',
    proposal_date: body.proposal_date ?? now.toISOString().split('T')[0],
    valid_until: body.valid_until ?? validUntil.toISOString().split('T')[0],

    // Content defaults from brief
    executive_summary: body.executive_summary ?? null,
    problem_statement: body.problem_statement ?? null,
    recommended_solution: body.recommended_solution ?? sources.recommended_solution,
    scope_items: body.scope_items ?? [],
    deliverables: body.deliverables ?? [],
    timeline_summary: body.timeline_summary ?? sources.timeline_estimate,
    timeline_phases: body.timeline_phases ?? [],

    // Commercial defaults from pricing
    build_price: body.build_price ?? (sources.build_pricing?.recommended_build_price ?? null),
    deposit_percent: body.deposit_percent ?? 50,
    deposit_amount: null,
    balance_amount: null,
    running_costs: body.running_costs ?? (sources.running_costs?.items ?? []),
    optional_addons: body.optional_addons ?? [],
    assumptions: body.assumptions ?? [],
    exclusions: body.exclusions ?? [],
    next_steps: body.next_steps ?? [],
    payment_notes: body.payment_notes ?? null,
    acceptance_mode: body.acceptance_mode ?? 'email',
  };

  // Compute deposit/balance from build_price
  const buildPrice = typeof insert.build_price === 'number' ? insert.build_price : null;
  const depositPct = typeof insert.deposit_percent === 'number' ? insert.deposit_percent : 50;
  if (buildPrice !== null) {
    insert.deposit_amount = Math.round(buildPrice * (depositPct / 100) * 100) / 100;
    insert.balance_amount = Math.round((buildPrice - (insert.deposit_amount as number)) * 100) / 100;
  }

  const { data, error } = await supabaseServer
    .from('proposals')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log creation event
  void logProposalEvent(data.id, 'created', 'Initial proposal created', {
    version_number: 1,
    source_readiness_percent: sources.readiness.percent,
  });

  return NextResponse.json({ proposal: data }, { status: 201 });
}

/**
 * PATCH /api/hub/leads/[id]/proposal
 *
 * Updates the current proposal for this lead.
 * Returns 404 if no current proposal exists.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Find current proposal
  const { data: existing } = await supabaseServer
    .from('proposals')
    .select('id')
    .eq('lead_id', id)
    .eq('is_current', true)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'No current proposal found for this lead' }, { status: 404 });
  }

  const fields: Record<string, unknown> = {};

  // Text fields
  for (const field of ALLOWED_TEXT_FIELDS) {
    if (field in body) {
      const val = typeof body[field] === 'string' ? (body[field] as string).trim() : null;
      fields[field] = val || null;
    }
  }

  // JSON fields
  for (const field of ALLOWED_JSON_FIELDS) {
    if (field in body) {
      fields[field] = body[field] ?? [];
    }
  }

  // Numeric fields
  for (const field of ALLOWED_NUMERIC_FIELDS) {
    if (field in body) {
      const val = Number(body[field]);
      fields[field] = isNaN(val) ? null : val;
    }
  }

  // Date fields
  for (const field of ALLOWED_DATE_FIELDS) {
    if (field in body) {
      fields[field] = typeof body[field] === 'string' ? body[field] : null;
    }
  }

  // Status field (validated)
  if ('status' in body && typeof body.status === 'string') {
    if (ALLOWED_STATUSES.includes(body.status as ProposalStatus)) {
      fields.status = body.status;
    }
  }

  // Auto-compute deposit/balance when build_price or deposit_percent changes
  if ('build_price' in fields || 'deposit_percent' in fields) {
    // Fetch current values to merge
    const { data: current } = await supabaseServer
      .from('proposals')
      .select('build_price, deposit_percent')
      .eq('id', existing.id)
      .single();

    const bp = typeof fields.build_price === 'number' ? fields.build_price : (current?.build_price ?? null);
    const dp = typeof fields.deposit_percent === 'number' ? fields.deposit_percent : (current?.deposit_percent ?? 50);

    if (bp !== null) {
      const depAmt = Math.round(bp * (dp / 100) * 100) / 100;
      fields.deposit_amount = depAmt;
      fields.balance_amount = Math.round((bp - depAmt) * 100) / 100;
    }
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('proposals')
    .update(fields)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log update event
  void logProposalEvent(existing.id, 'updated', 'Proposal updated', {
    fields_updated: Object.keys(fields),
  });

  return NextResponse.json({ proposal: data });
}
