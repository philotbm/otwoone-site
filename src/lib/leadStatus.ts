/**
 * Canonical lead lifecycle statuses — single source of truth.
 * Must stay in sync with the leads_status_check DB constraint.
 */

export const LEAD_STATUSES = [
  'enquiry_received',
  'scope_analysis',
  'ready_for_proposal',
  'proposal_sent',
  'client_approved',
  'deposit_requested',
  'in_build',
  'client_review',
  'revisions',
  'final_approval',
  'full_payment_requested',
  'complete',
] as const;

export type LeadStatus = typeof LEAD_STATUSES[number];

/** Operator-facing labels */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  enquiry_received:       "Enquiry Received",
  scope_analysis:         "Scope Analysis",
  ready_for_proposal:     "Ready for Proposal",
  proposal_sent:          "Proposal Sent",
  client_approved:        "Client Approved",
  deposit_requested:      "Deposit Requested",
  in_build:               "In Build",
  client_review:          "Client Review",
  revisions:              "Revisions",
  final_approval:         "Final Approval",
  full_payment_requested: "Full Payment Requested",
  complete:               "Complete",
};

/** Colour tokens for status badges */
export const LEAD_STATUS_COLOURS: Record<LeadStatus, { label: string; colour: string }> = {
  enquiry_received:       { label: "Enquiry Received",       colour: "text-blue-400 bg-blue-400/10" },
  scope_analysis:         { label: "Scope Analysis",         colour: "text-cyan-400 bg-cyan-400/10" },
  ready_for_proposal:     { label: "Ready for Proposal",     colour: "text-indigo-400 bg-indigo-400/10" },
  proposal_sent:          { label: "Proposal Sent",          colour: "text-purple-400 bg-purple-400/10" },
  client_approved:        { label: "Client Approved",        colour: "text-emerald-400 bg-emerald-400/10" },
  deposit_requested:      { label: "Deposit Requested",      colour: "text-orange-400 bg-orange-400/10" },
  in_build:               { label: "In Build",               colour: "text-amber-400 bg-amber-400/10" },
  client_review:          { label: "Client Review",          colour: "text-teal-400 bg-teal-400/10" },
  revisions:              { label: "Revisions",              colour: "text-yellow-400 bg-yellow-400/10" },
  final_approval:         { label: "Final Approval",         colour: "text-lime-400 bg-lime-400/10" },
  full_payment_requested: { label: "Full Payment Requested", colour: "text-pink-400 bg-pink-400/10" },
  complete:               { label: "Complete",               colour: "text-green-400 bg-green-400/10" },
};

/** Meeting types tied to lifecycle stages */
export const MEETING_TYPES = [
  'discovery_call',
  'proposal_walkthrough',
  'build_review',
  'client_review_session',
  'handover_call',
] as const;

export type MeetingType = typeof MEETING_TYPES[number];

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  discovery_call:         "Scoping Call",
  proposal_walkthrough:   "Proposal Walkthrough",
  build_review:           "Build Review",
  client_review_session:  "Client Review Session",
  handover_call:          "Handover Call",
};

/** Meeting stage values */
export const MEETING_STAGES = [
  'scope_analysis',
  'proposal_sent',
  'in_build',
  'client_review',
  'final_approval',
] as const;

export type MeetingStage = typeof MEETING_STAGES[number];

/** Meeting outcome values */
export const MEETING_OUTCOMES = [
  'scope_expanded',
  'scope_reduced',
  'no_change',
  'ready_for_proposal',
  'proposal_approved',
  'changes_requested',
  'approved',
  'blocked',
] as const;

export type MeetingOutcome = typeof MEETING_OUTCOMES[number];

export const MEETING_OUTCOME_LABELS: Record<MeetingOutcome, string> = {
  scope_expanded:     "Scope Expanded",
  scope_reduced:      "Scope Reduced",
  no_change:          "No Change",
  ready_for_proposal: "Ready for Proposal",
  proposal_approved:  "Proposal Approved",
  changes_requested:  "Changes Requested",
  approved:           "Approved",
  blocked:            "Blocked",
};

/** Meeting type */
export type Meeting = {
  id: string;
  lead_id: string;
  stage: MeetingStage;
  type: MeetingType;
  scheduled_at: string;
  completed_at: string | null;
  notes: string;
  outcome: MeetingOutcome | null;
  next_action_hint: string | null;
  created_at: string;
  updated_at: string;
};
