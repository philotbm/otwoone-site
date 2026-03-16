// ============================================================================
// Proposal Source Assembly Layer
// v1.80.0
//
// Gathers and normalises all upstream proposal inputs from the lead and
// related records into a single typed ProposalSourcePackage.
//
// Design principles:
// - Consumes existing persisted outputs (does not re-derive from scratch)
// - Treats clarification rounds as first-class source inputs
// - Gracefully handles missing scoping_reply and missing proposal_draft
// - Pricing data is passed in from the frontend (transient/computed)
// ============================================================================

import { supabaseServer } from '@/lib/supabaseServer';
import type { ProposalSourcePackage, RunningCostItem } from '@/lib/proposalTypes';

// ── Types for DB rows ───────────────────────────────────────────────────────

type LeadRow = {
  id: string;
  contact_name: string | null;
  contact_email: string;
  company_name: string | null;
  company_website: string | null;
  role: string | null;
  decision_authority: string | null;
  engagement_type: string | null;
  budget: string | null;
  timeline: string | null;
  lead_details: {
    success_definition: string | null;
    current_tools: string | null;
    clarifier_answers: Record<string, string> | null;
  } | null;
};

type BriefRow = {
  scoping_reply: string | null;
  project_summary: string | null;
  project_type: string | null;
  recommended_solution: string | null;
  suggested_pages: string | null;
  suggested_features: string | null;
  suggested_integrations: string | null;
  timeline_estimate: string | null;
  budget_positioning: string | null;
  risks_and_unknowns: string | null;
  follow_up_questions: string | null;
  proposal_draft: string | null;
  scope_ready: boolean | null;
  readiness_reason: string | null;
  override_scope_warning: boolean | null;
  technical_research: Record<string, unknown> | null;
};

type RoundRow = {
  round_number: number;
  status: string;
  questions: string | null;
  client_reply: string | null;
};

// ── Build pricing / running costs (passed from frontend) ────────────────────

export type BuildPricingInput = ProposalSourcePackage['build_pricing'];
export type RunningCostsInput = ProposalSourcePackage['running_costs'];

// ── Assembly function ───────────────────────────────────────────────────────

/**
 * Assembles a ProposalSourcePackage from persisted upstream data.
 *
 * @param leadId    - The lead UUID
 * @param pricing   - Build pricing (computed on frontend, passed in)
 * @param costs     - Running costs (computed on frontend, passed in)
 */
export async function assembleProposalSources(
  leadId: string,
  pricing: BuildPricingInput = null,
  costs: RunningCostsInput = null,
): Promise<ProposalSourcePackage | { error: string }> {

  // 1. Fetch lead + lead_details
  const { data: lead, error: leadErr } = await supabaseServer
    .from('leads')
    .select(`
      id, contact_name, contact_email, company_name, company_website,
      role, decision_authority, engagement_type, budget, timeline,
      lead_details (success_definition, current_tools, clarifier_answers)
    `)
    .eq('id', leadId)
    .single();

  if (leadErr || !lead) {
    return { error: leadErr?.message ?? 'Lead not found' };
  }

  const typedLead = lead as unknown as LeadRow;

  // 2. Fetch brief
  const { data: briefRaw } = await supabaseServer
    .from('lead_briefs')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();

  const brief = (briefRaw as BriefRow | null) ?? null;

  // 3. Fetch clarification rounds (replied or closed)
  const { data: roundsRaw } = await supabaseServer
    .from('clarification_rounds')
    .select('round_number, status, questions, client_reply')
    .eq('lead_id', leadId)
    .in('status', ['replied', 'closed'])
    .order('round_number', { ascending: true });

  const rounds = (roundsRaw as RoundRow[] | null) ?? [];

  // 4. Compute readiness checks
  const checks = [
    { label: 'Client intake',      ok: !!(typedLead.lead_details?.success_definition?.trim()) },
    { label: 'Scope clarity',      ok: !!(brief?.scoping_reply?.trim() || rounds.length > 0) },
    { label: 'System analysis',    ok: (brief?.project_summary?.trim() ?? '').length > 15 && (brief?.recommended_solution?.trim() ?? '').length > 15 },
    { label: 'Technical research', ok: !!brief?.technical_research },
    { label: 'Build pricing',      ok: pricing !== null },
    { label: 'Running costs',      ok: costs !== null },
    { label: 'Scope readiness',    ok: brief?.scope_ready === true || (brief?.scope_ready === false && brief?.override_scope_warning === true) },
  ];
  const doneCount = checks.filter(c => c.ok).length;

  // 5. Assemble
  return {
    lead_id: typedLead.id,
    contact_name: typedLead.contact_name,
    contact_email: typedLead.contact_email,
    company_name: typedLead.company_name,
    company_website: typedLead.company_website,
    role: typedLead.role,
    decision_authority: typedLead.decision_authority,

    engagement_type: typedLead.engagement_type,
    budget: typedLead.budget,
    timeline: typedLead.timeline,
    success_definition: typedLead.lead_details?.success_definition ?? null,
    current_tools: typedLead.lead_details?.current_tools ?? null,
    clarifier_answers: typedLead.lead_details?.clarifier_answers ?? null,

    scoping_reply: brief?.scoping_reply ?? null,
    clarification_rounds: rounds.map(r => ({
      round_number: r.round_number,
      questions: r.questions,
      client_reply: r.client_reply,
      status: r.status,
    })),

    project_summary: brief?.project_summary ?? null,
    project_type: brief?.project_type ?? null,
    recommended_solution: brief?.recommended_solution ?? null,
    suggested_pages: brief?.suggested_pages ?? null,
    suggested_features: brief?.suggested_features ?? null,
    suggested_integrations: brief?.suggested_integrations ?? null,
    timeline_estimate: brief?.timeline_estimate ?? null,
    budget_positioning: brief?.budget_positioning ?? null,
    risks_and_unknowns: brief?.risks_and_unknowns ?? null,
    follow_up_questions: brief?.follow_up_questions ?? null,

    scope_ready: brief?.scope_ready ?? null,
    readiness_reason: brief?.readiness_reason ?? null,
    override_scope_warning: brief?.override_scope_warning === true,

    technical_research: brief?.technical_research ?? null,

    build_pricing: pricing,
    running_costs: costs,

    existing_proposal_draft: brief?.proposal_draft ?? null,

    readiness: {
      score: doneCount,
      total: checks.length,
      percent: Math.round((doneCount / checks.length) * 100),
      checks,
    },
  };
}
