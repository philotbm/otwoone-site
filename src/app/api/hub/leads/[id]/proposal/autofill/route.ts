import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { assembleProposalSources } from '@/lib/proposalSourceAssembly';
import { generateProposalAutofill } from '@/lib/proposalAutofill';
import { logProposalEvent } from '@/lib/proposalEvents';
import type { Proposal } from '@/lib/proposalTypes';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/hub/leads/[id]/proposal/autofill
 *
 * Generates structured proposal content from all available upstream sources
 * using Claude AI. Writes the result into the current proposal record,
 * only filling fields that are currently empty/default.
 *
 * Body (optional):
 *   build_pricing?: object   — transient pricing from frontend
 *   running_costs?: object   — transient running costs from frontend
 *   force?: boolean          — overwrite non-empty fields too
 *
 * Returns { proposal, autofill: { confidence, confidence_reason } }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  // Parse optional body
  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    // empty body is fine
  }

  // 1. Verify a current proposal exists
  const { data: existing } = await supabaseServer
    .from('proposals')
    .select('*')
    .eq('lead_id', id)
    .eq('is_current', true)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: 'No current proposal found. Create a proposal first.' },
      { status: 404 },
    );
  }

  const proposal = existing as unknown as Proposal;

  // 2. Assemble sources
  const pricingInput = (body.build_pricing ?? null) as Parameters<typeof assembleProposalSources>[1];
  const costsInput = (body.running_costs ?? null) as Parameters<typeof assembleProposalSources>[2];

  const sourcesResult = await assembleProposalSources(id, pricingInput, costsInput);
  if ('error' in sourcesResult) {
    return NextResponse.json({ error: sourcesResult.error }, { status: 404 });
  }

  // 3. Generate autofill via Claude
  let autofillResult;
  try {
    autofillResult = await generateProposalAutofill(sourcesResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Autofill generation failed';
    console.error('[proposal/autofill] Generation error:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 4. Build safe patch — only fill empty fields unless force=true
  const force = body.force === true;
  const patch: Record<string, unknown> = {};
  const generated = autofillResult.fields;

  // Text fields: fill if currently null/empty
  const textFields = [
    'executive_summary', 'problem_statement', 'recommended_solution',
    'timeline_summary', 'balance_terms',
  ] as const;

  for (const field of textFields) {
    const currentVal = proposal[field];
    const newVal = generated[field];
    if (!newVal) continue; // AI returned empty — skip
    if (force || !currentVal || (typeof currentVal === 'string' && currentVal.trim().length === 0)) {
      patch[field] = newVal;
    }
  }

  // JSON array fields: fill if currently empty array
  const arrayFields = [
    'scope_items', 'deliverables', 'timeline_phases',
    'assumptions', 'exclusions', 'next_steps',
  ] as const;

  for (const field of arrayFields) {
    const currentVal = proposal[field];
    const newVal = generated[field];
    if (!Array.isArray(newVal) || newVal.length === 0) continue; // AI returned empty — skip
    if (force || !Array.isArray(currentVal) || currentVal.length === 0) {
      patch[field] = newVal;
    }
  }

  if (Object.keys(patch).length === 0) {
    // Nothing to update — all fields already have content
    return NextResponse.json({
      proposal,
      autofill: {
        confidence: autofillResult.confidence,
        confidence_reason: autofillResult.confidence_reason,
        fields_updated: [],
        skipped_reason: 'All target fields already have content. Use force=true to overwrite.',
      },
    });
  }

  // 5. Write to DB
  const { data: updated, error: updateErr } = await supabaseServer
    .from('proposals')
    .update(patch)
    .eq('id', proposal.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 6. Log event
  void logProposalEvent(proposal.id, 'autofilled', 'Proposal autofilled from sources', {
    fields_updated: Object.keys(patch),
    confidence: autofillResult.confidence,
    source_readiness_percent: sourcesResult.readiness.percent,
  });

  return NextResponse.json({
    proposal: updated,
    autofill: {
      confidence: autofillResult.confidence,
      confidence_reason: autofillResult.confidence_reason,
      fields_updated: Object.keys(patch),
    },
  });
}
