// ============================================================================
// Proposal Engine — TypeScript types
// v1.83.0
// ============================================================================

// ── Proposal statuses (independent of lead status) ──────────────────────────

export const PROPOSAL_STATUSES = [
  'draft',
  'ready',
  'sent',
  'viewed',
  'approved',
  'signed',
  'deposit_requested',
  'deposit_received',
  'superseded',
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft',
  ready: 'Ready to Send',
  sent: 'Sent',
  viewed: 'Viewed',
  approved: 'Approved',
  signed: 'Signed',
  deposit_requested: 'Deposit Requested',
  deposit_received: 'Deposit Received',
  superseded: 'Superseded',
};

// ── Proposal record (matches DB schema) ─────────────────────────────────────

export type ScopeItem = {
  label: string;
  description?: string;
};

export type Deliverable = {
  label: string;
  description?: string;
};

export type TimelinePhase = {
  phase: string;
  duration: string;
  description?: string;
};

export type RunningCostItem = {
  name: string;
  low: number;
  high: number;
  relevance: string;
};

export type AddonItem = {
  label: string;
  price?: number;
  description?: string;
};

export type Proposal = {
  id: string;
  lead_id: string;
  version_number: number;
  is_current: boolean;
  status: ProposalStatus;

  // Identity / header
  title: string | null;
  client_name: string | null;
  client_company: string | null;
  prepared_for: string | null;
  prepared_by: string | null;
  proposal_date: string | null;
  valid_until: string | null;

  // Proposal content
  executive_summary: string | null;
  problem_statement: string | null;
  recommended_solution: string | null;
  scope_items: ScopeItem[];
  deliverables: Deliverable[];
  timeline_summary: string | null;
  timeline_phases: TimelinePhase[];

  // Commercial
  build_price: number | null;
  deposit_percent: number | null;
  deposit_amount: number | null;
  balance_amount: number | null;
  balance_terms: string | null;
  running_costs: RunningCostItem[];
  optional_addons: AddonItem[];
  assumptions: string[];
  exclusions: string[];
  next_steps: string[];
  payment_notes: string | null;

  // Terms
  terms_template_id: string | null;
  terms_version: string | null;

  // Acceptance / delivery
  acceptance_mode: 'email' | 'signature' | 'portal' | null;
  pdf_url: string | null;
  signing_url: string | null;
  view_token: string | null;

  // Lifecycle timestamps
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  signed_at: string | null;
  deposit_requested_at: string | null;
  deposit_received_at: string | null;

  // Versioning
  supersedes_proposal_id: string | null;

  created_at: string;
  updated_at: string;
};

// ── Proposal event types ────────────────────────────────────────────────────

export const PROPOSAL_EVENT_TYPES = [
  'created',
  'updated',
  'autofilled',
  'pdf_generated',
  'sent',
  'viewed',
  'approved',
  'signed',
  'deposit_requested',
  'deposit_received',
  'superseded',
] as const;

export type ProposalEventType = (typeof PROPOSAL_EVENT_TYPES)[number];

export type ProposalEvent = {
  id: string;
  proposal_id: string;
  event_type: ProposalEventType;
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

// ── Proposal source assembly package ────────────────────────────────────────
// Gathered from upstream lead data to inform proposal creation/autofill.

export type ClarificationRoundSource = {
  round_number: number;
  questions: string | null;
  client_reply: string | null;
  status: string;
};

export type ProposalSourcePackage = {
  // Lead identity
  lead_id: string;
  contact_name: string | null;
  contact_email: string;
  company_name: string | null;
  company_website: string | null;
  role: string | null;
  decision_authority: string | null;

  // Intake context
  engagement_type: string | null;
  budget: string | null;
  timeline: string | null;
  success_definition: string | null;
  current_tools: string | null;
  clarifier_answers: Record<string, string> | null;

  // Scoping
  scoping_reply: string | null;
  clarification_rounds: ClarificationRoundSource[];

  // Brief fields
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

  // Scope readiness
  scope_ready: boolean | null;
  readiness_reason: string | null;
  override_scope_warning: boolean;

  // Technical research (structured)
  technical_research: Record<string, unknown> | null;

  // Computed pricing (passed in from frontend since these are transient)
  build_pricing: {
    recommended_build_days: number;
    recommended_build_price: number;
    day_rate: number;
    confidence_range_low: number;
    confidence_range_high: number;
    client_budget_low: number | null;
    client_budget_high: number | null;
    commercial_strategy: string;
  } | null;

  running_costs: {
    items: RunningCostItem[];
    support_retainer: number;
    total_low: number;
    total_high: number;
    total_with_retainer_low: number;
    total_with_retainer_high: number;
  } | null;

  // Existing draft (optional operator input, not primary source)
  existing_proposal_draft: string | null;

  // Readiness signal
  readiness: {
    score: number;
    total: number;
    percent: number;
    checks: Array<{ label: string; ok: boolean }>;
  };
};

// ── Terms template ────────────────────────────────────────────────────────

export type TermsTemplate = {
  id: string;
  name: string;
  version: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
