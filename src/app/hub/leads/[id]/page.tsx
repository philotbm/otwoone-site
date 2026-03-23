"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projectStatus";
import type { Proposal, ProposalStatus } from "@/lib/proposalTypes";
import {
  LEAD_STATUSES,
  type LeadStatus,
  LEAD_STATUS_LABELS,
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
  MEETING_STAGES,
  MEETING_OUTCOMES,
  MEETING_OUTCOME_LABELS,
  type Meeting,
  type MeetingType,
  type MeetingStage,
  type MeetingOutcome,
} from "@/lib/leadStatus";

// ─── Safe JSON fetch ─────────────────────────────────────────────────────────
// Defensively fetches JSON from an API route. Checks res.ok and content-type
// before parsing. Never throws raw JSON parse errors into the UI.

async function safeFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string }> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return { ok: false, status: 0, error: "Network error. Please check your connection and try again." };
  }

  const ct = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    // Try to extract a JSON error message if the response is JSON
    if (ct.includes("application/json")) {
      try {
        const body = await res.json() as { error?: string };
        return { ok: false, status: res.status, error: body.error ?? `Request failed (${res.status}).` };
      } catch {
        // JSON parse failed even though content-type says JSON
      }
    }
    // Non-JSON error (HTML redirect, error page, etc.)
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: res.status, error: "Session expired. Please refresh the page and log in again." };
    }
    return { ok: false, status: res.status, error: `Request failed (${res.status}). Please refresh and try again.` };
  }

  // Response is ok — parse JSON safely
  if (!ct.includes("application/json")) {
    return { ok: false, status: res.status, error: "Unexpected response format. Please refresh and try again." };
  }

  try {
    const data = await res.json() as T;
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: res.status, error: "Could not parse response. Please refresh and try again." };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  created_at: string;
  project_status: ProjectStatus | null;
  hosting_required: boolean;
  maintenance_plan: "starter_49" | "essential" | "growth" | "accelerator" | "none" | null;
  maintenance_status: "pending" | "active" | "suspended" | "cancelled" | null;
  delivery_completed_at: string | null;
  sharepoint_folder_url: string | null;
  sharepoint_folder_error: string | null;
  intake_status: "not_sent" | "sent" | "in_progress" | "complete" | null;
  reviews_included: number;
  reviews_used: number;
  deposit_paid_at: string | null;
  deposit_amount: number | null;
  deposit_reference: string | null;
  intake_token: string | null;
};

type IntakeStep1 = {
  contact_name?: string;
  project_name?: string;
  goals?: string;
};

type IntakeStep2 = {
  headline?: string;
  subheadline?: string;
  services?: string[];
  about?: string;
  primary_cta?: string;
};

type IntakeApiResponse = {
  project: {
    id: string;
    intake_status: string | null;
    intake_last_saved_at: string | null;
    client_contact_name: string | null;
    client_contact_email: string | null;
  };
  intake: {
    step1: IntakeStep1 | null;
    step2: IntakeStep2 | null;
    step3: Record<string, unknown> | null;
    completed_at: string | null;
  } | null;
};

type Lead = {
  id: string;
  created_at: string;
  source: string;
  status: LeadStatus;
  contact_name: string | null;
  contact_email: string;
  company_name: string | null;
  company_website: string | null;
  role: string | null;
  decision_authority: string | null;
  engagement_type: string | null;
  budget: string | null;
  timeline: string | null;
  discovery_depth: string | null;
  discovery_depth_suggested: string | null;
  clarity_score: number | null;
  alignment_score: number | null;
  complexity_score: number | null;
  authority_score: number | null;
  total_score: number | null;
  proposed_hosting_required: boolean | null;
  proposed_maintenance_plan: string | null;
  lead_details: {
    raw_submission: Record<string, unknown> | null;
    clarifier_answers: Record<string, string> | null;
    success_definition: string | null;
    current_tools: string | null;
    internal_notes: string | null;
  } | null;
  projects: Project[] | null;
};

type ClarificationRound = {
  id: string;
  lead_id: string;
  round_number: number;
  status: "draft" | "sent" | "replied" | "closed";
  questions: string | null;
  client_reply: string | null;
  generated_email: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectEvent = {
  id: string;
  event_type: string;
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type RevisionItem = {
  id: string;
  project_id: string;
  feedback_event_id: string | null;
  revision_type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  batch_label: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ExecutionBatch = {
  project_id: string;
  project_name: string | null;
  batch_label: string | null;
  generated_at: string;
  total_items: number;
  summary: {
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  };
  revisions_by_type: Array<{
    type: string;
    count: number;
    items: Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      status: string;
      source: string;
    }>;
  }>;
};

type IntakePath = 'clarification_email' | 'discovery_call' | 'proceed_to_brief';

type LeadBrief = {
  id: string;
  lead_id: string;
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
  override_scope_warning: boolean | null;
  contact_strategy: string | null;
  scope_ready: boolean | null;
  readiness_reason: string | null;
  intake_path: IntakePath | null;
  revision_context: string | null;
  technical_research: TechnicalResearch | null;
  technical_research_updated_at: string | null;
  complexity_result: ComplexityResult | null;
  created_at: string;
  updated_at: string;
};

type ResearchItem = {
  name: string;
  description: string;
  pricing?: string;
  docs_url?: string;
  relevance: "required" | "likely" | "optional";
};

type ResearchCategory = {
  items: ResearchItem[];
  summary: string;
};

type TechnicalResearch = {
  summary: string;
  recommendations: string[];
  assumptions: string[];
  unknowns: string[];
  integrations: ResearchCategory;
  infrastructure: ResearchCategory;
  third_party_services: ResearchCategory;
  compliance: ResearchCategory;
  operating_cost_estimate: ResearchCategory;
};

// ── Complexity Engine types ──────────────────────────────────────────────────

type ComplexitySignal = {
  key: string;
  weight: number;
  evidence: string;
};

type ComplexityBuildComponent = {
  key: string;
  label: string;
  days_low: number;
  days_high: number;
};

type ComplexityResult = {
  complexity_score: number;
  complexity_class: string;
  detected_signals: ComplexitySignal[];
  build_components: ComplexityBuildComponent[];
  estimated_days_low: number;
  estimated_days_high: number;
  complexity_rationale: string;
  upstream_sources_used: string[];
};

type LeadIteration = {
  id: string;
  lead_id: string;
  source_type: "call" | "email" | "document" | "other";
  source_date: string | null;
  notes: string;
  created_at: string;
};

// ── Lead Revision Execution types ─────────────────────────────────────────────

type LeadRevisionBatchItem = {
  description: string;
  type: 'content' | 'design' | 'functionality' | 'integration' | 'other';
};

type LeadRevisionBatch = {
  title: string;
  priority: 'high' | 'medium' | 'low';
  effort?: 'small' | 'medium' | 'large';
  status?: 'pending' | 'ready' | 'in_progress' | 'complete';
  operator_note?: string;
  objective?: string;
  implementation_notes?: string;
  open_questions?: string[];
  acceptance_criteria?: string[];
  items: LeadRevisionBatchItem[];
};

type LeadRevisionRecord = {
  id: string;
  lead_id: string;
  raw_feedback: string;
  structured_output: { batches: LeadRevisionBatch[] };
  created_at: string;
  updated_at: string;
};

type ExecutionRun = {
  id: string;
  revision_id: string;
  batch_index: number;
  output_report: string;
  operator_note: string;
  qa_status: 'pending' | 'passed' | 'failed';
  qa_notes: string;
  created_at: string;
};

type ProjectContext = {
  id: string;
  project_id: string;
  business_summary: string | null;
  project_summary: string | null;
  current_stack: string | null;
  key_urls: string | null;
  constraints: string | null;
  ai_notes: string | null;
  acceptance_notes: string | null;
  created_at: string;
  updated_at: string;
};

type ExecutionPack = {
  project_id: string;
  project_name: string | null;
  generated_at: string;
  batch_label: string | null;
  context: {
    business_summary: string | null;
    project_summary: string | null;
    current_stack: string | null;
    key_urls: string | null;
    constraints: string | null;
    ai_notes: string | null;
    acceptance_notes: string | null;
  };
  summary: {
    total_items: number;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  };
  revisions_by_type: Array<{
    type: string;
    count: number;
    items: Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      status: string;
      source: string;
    }>;
  }>;
};

// ─── Labels ───────────────────────────────────────────────────────────────────

const ENGAGEMENT_LABELS: Record<string, string> = {
  build_new:       "Build something new",
  improve_existing:"Improve an existing website or system",
  tech_advice:     "Technology advice / strategic guidance",
  branding:        "Branding or design work",
  ongoing_support: "Ongoing support",
};

const BUDGET_LABELS: Record<string, string> = {
  under_3k:  "Under €3k",
  "3k_5k":   "€3k–€5k",
  "5k_15k":  "€5k–€15k",
  "15k_40k": "€15k–€40k",
  "40k_plus":"€40k+",
  not_sure:  "Not sure yet",
};

const TIMELINE_LABELS: Record<string, string> = {
  asap:         "As soon as possible",
  "1_3_months": "1–3 months",
  "3_6_months": "3–6 months",
  planning:     "Planning ahead",
};

const AUTHORITY_LABELS: Record<string, string> = {
  yes:    "Yes — decision maker",
  shared: "Shared — needs sign-off",
  no:     "No — gathering info",
};

const STATUS_OPTIONS: LeadStatus[] = [...LEAD_STATUSES];

/** Operator-facing status labels — delegates to shared module */
const STATUS_LABELS = LEAD_STATUS_LABELS;

/** Operator-facing next action guidance per status */
const NEXT_ACTION: Record<LeadStatus, string> = {
  enquiry_received:       "Run full analysis to assess this enquiry",
  scope_analysis:         "Gather information and analyse scope",
  ready_for_proposal:     "Prepare proposal",
  proposal_sent:          "Awaiting client decision — offer walkthrough",
  client_approved:        "Request deposit",
  deposit_requested:      "Awaiting deposit payment",
  in_build:               "Schedule build progress review",
  client_review:          "Run client review session",
  revisions:              "Apply revisions and re-submit",
  final_approval:         "Awaiting final sign-off",
  full_payment_requested: "Awaiting final payment",
  complete:               "Project complete",
};

/** Stage auto-select based on current lead status */
const STATUS_TO_MEETING_STAGE: Partial<Record<LeadStatus, MeetingStage>> = {
  enquiry_received:       "scope_analysis",
  scope_analysis:         "scope_analysis",
  ready_for_proposal:     "proposal_sent",
  proposal_sent:          "proposal_sent",
  client_approved:        "proposal_sent",
  deposit_requested:      "in_build",
  in_build:               "in_build",
  client_review:          "client_review",
  revisions:              "client_review",
  final_approval:         "final_approval",
  full_payment_requested: "final_approval",
  complete:               "final_approval",
};

/** Next best action logic — meeting-aware hints */
function meetingNextAction(status: LeadStatus, meetings: Meeting[]): string | null {
  const hasMeetings = meetings.length > 0;
  const recentMeeting = meetings.find(m => {
    const diff = Date.now() - new Date(m.scheduled_at).getTime();
    return diff < 7 * 86_400_000; // within last 7 days
  });

  if (status === "scope_analysis" && !hasMeetings) return "Gather information";
  if (status === "proposal_sent" && !hasMeetings) return "Offer proposal walkthrough";
  if (status === "in_build" && !recentMeeting) return "Schedule build progress review";
  if (status === "client_review") return "Run client review session";
  return null;
}

const CTA_LABELS: Record<string, string> = {
  call:         "Phone call",
  email:        "Email",
  contact_form: "Contact form",
  whatsapp:     "WhatsApp",
};

const ROUND_STATUS_LABELS: Record<string, string> = {
  draft:   "Draft",
  sent:    "Sent",
  replied: "Replied",
  closed:  "Closed",
};

const ROUND_STATUS_COLOUR: Record<string, string> = {
  draft:   "bg-gray-500/15 text-gray-400",
  sent:    "bg-indigo-500/15 text-indigo-400",
  replied: "bg-yellow-500/15 text-yellow-400",
  closed:  "bg-green-500/15 text-green-400",
};

const REVISION_TYPES = ['copy', 'design', 'feature', 'bug', 'other'] as const;
const REVISION_TYPE_LABELS: Record<string, string> = {
  copy: 'Copy', design: 'Design', feature: 'Feature', bug: 'Bug', other: 'Other',
};
const REVISION_STATUSES = ['queued', 'in_progress', 'complete'] as const;
const REVISION_STATUS_LABELS: Record<string, string> = {
  queued: 'Queued', in_progress: 'In progress', complete: 'Complete',
};
const REVISION_PRIORITIES = ['high', 'medium', 'low'] as const;
const REVISION_PRIORITY_LABELS: Record<string, string> = {
  high: 'High', medium: 'Medium', low: 'Low',
};
const REVISION_SOURCES = ['portal', 'email', 'internal'] as const;
const REVISION_SOURCE_LABELS: Record<string, string> = {
  portal: 'Portal', email: 'Email', internal: 'Internal',
};

const MAINTENANCE_PLANS = ["starter_49", "essential", "growth", "accelerator", "none"] as const;
const MAINTENANCE_MONTHLY: Record<string, number> = {
  starter_49: 49, essential: 99, growth: 199, accelerator: 299,
};
const MAINTENANCE_LABELS: Record<string, string> = {
  starter_49: "Starter", essential: "Foundation", growth: "Growth", accelerator: "Accelerator", none: "None",
};

// ─── Lifecycle stages ──────────────────────────────────────────────────────────

const LIFECYCLE_STAGES = [
  'Enquiry submitted', 'Brief complete', 'Requirements', 'Proposal sent',
  'Deposit paid', 'In build', 'Client review', 'Revisions', 'Final approval', 'Complete',
] as const;

const STATUS_STEP: Record<string, number> = {
  enquiry: 1, brief_complete: 2, requirements: 3, proposal_sent: 4,
  deposit_paid: 5, in_build: 6, client_review: 7, revisions: 8,
  final_approval: 9, complete: 10,
};

const STEP_STATUS: Record<number, ProjectStatus> = {
  1: 'enquiry', 2: 'brief_complete', 3: 'requirements', 4: 'proposal_sent',
  5: 'deposit_paid', 6: 'in_build', 7: 'client_review', 8: 'revisions',
  9: 'final_approval', 10: 'complete',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IE", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function eventLabel(ev: { event_type: string; meta: Record<string, unknown> | null }): string {
  if (ev.event_type === 'project_created') return 'Project created';
  if (ev.event_type === 'status_changed') {
    if (ev.meta?.attempted_to === 'revisions') return 'Review limit reached';
    const from = ev.meta?.from as string | undefined;
    const to   = ev.meta?.to   as string | undefined;
    if (from === 'deposit_paid' && to === 'in_build')  return 'Build started';
    if (from === 'in_build'     && to === 'complete')  return 'Project delivered';
    return 'Status updated';
  }
  return ev.event_type.replace(/_/g, ' ');
}

function eventIcon(ev: { event_type: string; meta: Record<string, unknown> | null }): string {
  if (ev.event_type === 'project_created') return '🟢';
  if (ev.event_type === 'status_changed') {
    if (ev.meta?.attempted_to === 'revisions') return '⛔';
    const from = ev.meta?.from as string | undefined;
    const to   = ev.meta?.to   as string | undefined;
    if (from === 'deposit_paid' && to === 'in_build') return '🔵';
    if (from === 'in_build'     && to === 'complete') return '✅';
    return '⚙️';
  }
  return '•';
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5">
        <h2 className="text-xs font-medium tracking-widest uppercase text-gray-500">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1.5">
      <span className="text-xs text-gray-500 w-36 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-200 flex-1">{value || "—"}</span>
    </div>
  );
}

// ─── Score bar ─────────────────────────────────────────────────────────────────

// ScoreBar removed v1.68.3 — replaced by Decision Signals

type SignalLevel = "Weak" | "Moderate" | "Strong";
type BudgetClarity = "Unknown" | "Partial" | "Clear";
type ScopeMaturity = "Early" | "Developing" | "Defined";
type CommercialFit = "Needs review" | "Likely fit" | "Strong fit" | "Budget risk";

type DecisionSignals = {
  inputQuality: SignalLevel;
  budgetClarity: BudgetClarity;
  scopeMaturity: ScopeMaturity;
  commercialFit: CommercialFit;
  nextBestAction: string;
};

function useDecisionSignals(lead: Lead | null, pricingRec: { pricingFit?: string; deliveryClass?: string } | null, stage1Rec: { label?: string } | null): DecisionSignals | null {
  return useMemo(() => {
    if (!lead) return null;

    // ── Input quality ──
    const successDef = lead.lead_details?.success_definition?.trim() ?? "";
    const clarifiers = lead.lead_details?.clarifier_answers ?? {};
    const clarifierCount = Object.keys(clarifiers).length;
    const clarifierText = Object.values(clarifiers).join(" ");
    const allInputText = [successDef, clarifierText].join(" ").trim();
    const hasSubstantiveSuccess = successDef.length >= 15 && !/^(test|n\/a|tbd|not sure|nothing|placeholder|unknown)$/i.test(successDef);

    let inputQuality: SignalLevel = "Weak";
    if (hasSubstantiveSuccess && clarifierCount >= 2 && allInputText.length > 80) {
      inputQuality = "Strong";
    } else if ((hasSubstantiveSuccess || clarifierCount >= 1) && allInputText.length > 30) {
      inputQuality = "Moderate";
    }

    // ── Budget clarity ──
    let budgetClarity: BudgetClarity = "Unknown";
    if (lead.budget && lead.budget !== "not_sure") {
      budgetClarity = "Clear";
    } else if (lead.budget === "not_sure") {
      budgetClarity = "Partial";
    }

    // ── Scope maturity ──
    const hasTimeline = Boolean(lead.timeline);
    const hasEngagement = Boolean(lead.engagement_type);
    const complexityKeywords = ["workflow", "integration", "api", "automation", "custom", "crm", "erp", "booking", "portal", "dashboard", "login", "auth", "database", "inventory", "scheduling"];
    const complexityHits = complexityKeywords.filter(kw => allInputText.toLowerCase().includes(kw)).length;

    let scopeMaturity: ScopeMaturity = "Early";
    if (hasSubstantiveSuccess && hasTimeline && hasEngagement && (clarifierCount >= 2 || complexityHits >= 2)) {
      scopeMaturity = "Defined";
    } else if ((hasSubstantiveSuccess || clarifierCount >= 1) && (hasTimeline || hasEngagement)) {
      scopeMaturity = "Developing";
    }

    // ── Commercial fit ──
    let commercialFit: CommercialFit = "Needs review";
    if (pricingRec) {
      if (pricingRec.pricingFit === "Tight") {
        commercialFit = "Budget risk";
      } else if (pricingRec.pricingFit === "Premium") {
        commercialFit = "Strong fit";
      } else if (pricingRec.pricingFit === "Feasible") {
        commercialFit = "Likely fit";
      } else if (pricingRec.deliveryClass === "Needs review") {
        commercialFit = "Needs review";
      }
    } else if (budgetClarity === "Clear" && scopeMaturity !== "Early") {
      commercialFit = "Likely fit";
    }

    // ── Next best action — aligned with evidence-driven readiness ──
    const nextBestAction =
      stage1Rec?.label === "Proceed to proposal" ? "Ready for proposal"
      : "Gather more information";

    return { inputQuality, budgetClarity, scopeMaturity, commercialFit, nextBestAction };
  }, [lead, pricingRec, stage1Rec]);
}

const SIGNAL_COLOURS: Record<string, string> = {
  // Input quality
  Weak:           "bg-red-500/15 text-red-400",
  Moderate:       "bg-amber-500/15 text-amber-400",
  Strong:         "bg-green-500/15 text-green-400",
  // Budget clarity
  Unknown:        "bg-red-500/15 text-red-400",
  Partial:        "bg-amber-500/15 text-amber-400",
  Clear:          "bg-green-500/15 text-green-400",
  // Scope maturity
  Early:          "bg-red-500/15 text-red-400",
  Developing:     "bg-amber-500/15 text-amber-400",
  Defined:        "bg-green-500/15 text-green-400",
  // Commercial fit
  "Needs review": "bg-gray-500/15 text-gray-400",
  "Likely fit":   "bg-amber-500/15 text-amber-400",
  "Strong fit":   "bg-green-500/15 text-green-400",
  "Budget risk":  "bg-red-500/15 text-red-400",
};

function SignalPill({ value }: { value: string }) {
  return (
    <span className={cx("inline-block px-2 py-0.5 rounded text-[11px] font-medium", SIGNAL_COLOURS[value] ?? "bg-gray-500/15 text-gray-400")}>
      {value}
    </span>
  );
}

// ─── Deposit activation modal ─────────────────────────────────────────────────

function DepositActivationModal({
  lead,
  onClose,
  onActivated,
}: {
  lead: Lead;
  onClose: () => void;
  onActivated: () => void;
}) {
  const [hostingRequired, setHostingRequired] = useState(
    lead.proposed_hosting_required ?? true
  );
  const [maintenancePlan, setMaintenancePlan] = useState(
    lead.proposed_maintenance_plan ?? "essential"
  );
  const [depositAmount, setDepositAmount] = useState("");
  const [depositReference, setDepositReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleActivate() {
    if (hostingRequired && maintenancePlan === "none") {
      setError("Select a maintenance plan when hosting is included.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await safeFetch<{ ok: boolean }>(`/api/hub/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hosting_required: hostingRequired,
          maintenance_plan: hostingRequired ? maintenancePlan : "none",
          deposit_amount: depositAmount.trim() ? Number(depositAmount) : null,
          deposit_reference: depositReference.trim() || null,
        }),
      });
      if (!result.ok) throw new Error(result.error);
      onActivated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0e0f14] border border-white/10 rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-white mb-1">Activate Deposit</h2>
        <p className="text-xs text-gray-500 mb-6">Record deposit payment and create the project.</p>

        {/* Deposit amount */}
        <div className="mb-5">
          <label className="text-xs text-gray-400 block mb-2">Deposit amount (optional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="e.g. 1500.00"
            className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        {/* Deposit reference */}
        <div className="mb-5">
          <label className="text-xs text-gray-400 block mb-2">Payment reference / note (optional)</label>
          <input
            type="text"
            value={depositReference}
            onChange={(e) => setDepositReference(e.target.value)}
            placeholder="e.g. INV-2026-042 or bank transfer ref"
            className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        {/* Hosting */}
        <div className="mb-5">
          <label className="text-xs text-gray-400 block mb-3">Hosting included?</label>
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setHostingRequired(v)}
                className={cx(
                  "flex-1 py-2.5 rounded-lg text-sm border transition-all",
                  hostingRequired === v
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                    : "border-white/10 text-gray-400 hover:border-white/20"
                )}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>

        {/* Maintenance plan */}
        {hostingRequired && (
          <div className="mb-5">
            <label className="text-xs text-gray-400 block mb-3">Maintenance plan</label>
            <div className="space-y-2">
              {(["starter_49", "essential", "growth", "accelerator"] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setMaintenancePlan(plan)}
                  className={cx(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm border transition-all",
                    maintenancePlan === plan
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                      : "border-white/10 text-gray-400 hover:border-white/20"
                  )}
                >
                  <span>{MAINTENANCE_LABELS[plan]}</span>
                  <span className="text-xs text-gray-500">€{MAINTENANCE_MONTHLY[plan]}/mo</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50"
          >
            {saving ? "Activating…" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lifecycle stepper ─────────────────────────────────────────────────────────

function LifecycleStepper({
  currentStep,
  onStepClick,
  disabled,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2">
      {LIFECYCLE_STAGES.map((label, i) => {
        const step             = i + 1;
        const done             = step < currentStep;
        const active           = step === currentStep;
        const isForwardBlocked = step > currentStep + 1;
        const isDisabled       = disabled || isForwardBlocked;
        return (
          <button
            key={step}
            type="button"
            disabled={isDisabled}
            onClick={() => { if (step !== currentStep) onStepClick(step); }}
            className={cx(
              "flex items-center gap-1.5",
              isDisabled ? "cursor-not-allowed opacity-50" :
              active     ? "cursor-default" :
                           "cursor-pointer group"
            )}
          >
            <div className={cx(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
              done   ? "bg-indigo-600 text-white" :
              active ? "bg-indigo-500/20 ring-1 ring-inset ring-indigo-500 text-indigo-300" :
                       "bg-white/5 text-gray-700"
            )}>
              {done ? '✓' : step}
            </div>
            <span className={cx(
              "text-xs whitespace-nowrap",
              active ? "text-indigo-300 font-medium" :
              done   ? "text-gray-400 group-hover:text-gray-200" :
                       "text-gray-700 group-hover:text-gray-500"
            )}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [lead, setLead]             = useState<Lead | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [notes, setNotes]           = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesOpen, setNotesOpen]   = useState(false);

  // Portal link state
  const [portalSending, setPortalSending] = useState(false);
  const [portalSent,    setPortalSent]    = useState(false);
  const [portalUrl,     setPortalUrl]     = useState("");
  const [portalError,   setPortalError]   = useState("");

  // Intake viewer state
  const [intakeOpen,    setIntakeOpen]    = useState(false);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeData,    setIntakeData]    = useState<IntakeApiResponse | null>(null);
  const [intakeError,   setIntakeError]   = useState("");

  // Timeline event state
  const [events,        setEvents]        = useState<ProjectEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError,   setEventsError]   = useState("");

  // Revision workspace state
  const [revisions,        setRevisions]        = useState<RevisionItem[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError,   setRevisionsError]   = useState("");
  const [revAddOpen,       setRevAddOpen]       = useState(false);
  const [revAddTitle,      setRevAddTitle]      = useState("");
  const [revAddDesc,       setRevAddDesc]       = useState("");
  const [revAddType,       setRevAddType]       = useState("other");
  const [revAddPriority,   setRevAddPriority]   = useState("medium");
  const [revAddSource,     setRevAddSource]     = useState("internal");
  const [revAddFeedbackId, setRevAddFeedbackId] = useState<string | null>(null);
  const [revSaving,        setRevSaving]        = useState(false);
  const [batchOutput,      setBatchOutput]      = useState("");
  const [batchLoading,     setBatchLoading]     = useState(false);

  // Project context state
  const [context,         setContext]         = useState<ProjectContext | null>(null);
  const [contextLoading,  setContextLoading]  = useState(false);
  const [contextSaving,   setContextSaving]   = useState(false);
  const [contextSaved,    setContextSaved]    = useState(false);
  const [ctxBusiness,     setCtxBusiness]     = useState("");
  const [ctxProject,      setCtxProject]      = useState("");
  const [ctxStack,        setCtxStack]        = useState("");
  const [ctxUrls,         setCtxUrls]         = useState("");
  const [ctxConstraints,  setCtxConstraints]  = useState("");
  const [ctxAiNotes,      setCtxAiNotes]      = useState("");
  const [ctxAcceptance,   setCtxAcceptance]   = useState("");

  // Execution pack state
  const [execPack,        setExecPack]        = useState<ExecutionPack | null>(null);
  const [execPackLoading, setExecPackLoading] = useState(false);
  const [execPackTab,     setExecPackTab]     = useState<'chatgpt' | 'claude' | 'json'>('chatgpt');

  // Clarification rounds state
  const [rounds, setRounds]                     = useState<ClarificationRound[]>([]);
  const [roundsLoading, setRoundsLoading]       = useState(false);
  const [roundSaving, setRoundSaving]           = useState<string | null>(null);
  const [expandedRound, setExpandedRound]       = useState<string | null>(null);
  const [draftQuestions, setDraftQuestions]      = useState<Record<string, string>>({});
  const [draftReplies, setDraftReplies]         = useState<Record<string, string>>({});

  // Local edit state
  const [status, setStatus]                     = useState<LeadStatus>("enquiry_received");
  const [discoveryDepth, setDiscoveryDepth]     = useState("");
  const [proposedHosting, setProposedHosting]   = useState<"yes" | "no" | "">("");
  const [proposedPlan, setProposedPlan]         = useState("");
  const [reviewsIncluded, setReviewsIncluded]   = useState(2);
  const [reviewLimitError, setReviewLimitError] = useState("");
  // scopingError removed v1.68.2 — scoping CTA moved to Scope Readiness only

  // Project brief state
  const [brief,            setBrief]            = useState<LeadBrief | null>(null);
  const [briefLoading,     setBriefLoading]     = useState(false);
  const [briefSaving,      setBriefSaving]      = useState(false);
  const [briefSaved,       setBriefSaved]       = useState(false);
  const [briefReply,       setBriefReply]       = useState("");
  const [briefSummary,     setBriefSummary]     = useState("");
  const [briefType,        setBriefType]        = useState("");
  const [briefSolution,    setBriefSolution]    = useState("");
  const [briefPages,       setBriefPages]       = useState("");
  const [briefFeatures,    setBriefFeatures]    = useState("");
  const [briefIntegrations,setBriefIntegrations]= useState("");
  const [briefTimeline,    setBriefTimeline]    = useState("");
  const [briefBudget,      setBriefBudget]      = useState("");
  const [briefRisks,       setBriefRisks]       = useState("");
  const [briefFollowUp,    setBriefFollowUp]    = useState("");
  const [briefProposal,    setBriefProposal]    = useState("");
  const [briefPromptOutput,setBriefPromptOutput]= useState("");
  const [briefPromptCopied,setBriefPromptCopied]= useState(false);
  const [proposalCopied,   setProposalCopied]   = useState(false);
  const [autofillLoading,  setAutofillLoading]  = useState(false);
  const [autofillError,    setAutofillError]    = useState("");
  const [researchLoading,  setResearchLoading]  = useState(false);
  const [researchError,    setResearchError]    = useState("");
  const [technicalResearch, setTechnicalResearch] = useState<TechnicalResearch | null>(null);
  const [researchUpdatedAt, setResearchUpdatedAt] = useState<string | null>(null);
  const [revisionContext,   setRevisionContext]   = useState("");
  const [revisionDraft,     setRevisionDraft]     = useState("");
  const [revisionApplying,  setRevisionApplying]  = useState(false);
  const [complexityResult,  setComplexityResult]  = useState<ComplexityResult | null>(null);
  const [complexityLoading, setComplexityLoading] = useState(false);
  const [complexityError,   setComplexityError]   = useState("");
  const [scopeReady,       setScopeReady]       = useState<boolean | null>(null);
  const [readinessReason,  setReadinessReason]  = useState("");

  // Iteration log state
  const [iterations,          setIterations]          = useState<LeadIteration[]>([]);
  const [iterationsLoading,   setIterationsLoading]   = useState(false);
  const [iterSourceType,      setIterSourceType]      = useState<"call" | "email" | "meeting" | "document" | "client_reply" | "internal_note" | "other">("call");
  const [iterSourceDate,      setIterSourceDate]      = useState("");
  const [iterNotes,           setIterNotes]           = useState("");
  const [iterSaving,          setIterSaving]          = useState(false);
  const [unifiedRunning,      setUnifiedRunning]      = useState(false);
  const [expandedIteration,   setExpandedIteration]   = useState<string | null>(null);

  // Lead Revision Execution state
  const [leadRevisions,          setLeadRevisions]          = useState<LeadRevisionRecord[]>([]);
  const [leadRevFeedback,        setLeadRevFeedback]        = useState("");
  const [leadRevGenerating,      setLeadRevGenerating]      = useState(false);
  const [leadRevError,           setLeadRevError]           = useState("");
  const [expandedBriefs,         setExpandedBriefs]         = useState<Set<string>>(new Set());
  const [taskPrompt,             setTaskPrompt]             = useState<string | null>(null);
  const [taskGenerating,         setTaskGenerating]         = useState(false);
  const [taskCopied,             setTaskCopied]             = useState(false);
  const [executionRuns,          setExecutionRuns]          = useState<ExecutionRun[]>([]);
  const [runReportInputs,        setRunReportInputs]        = useState<Record<string, string>>({});
  const [runNoteInputs,          setRunNoteInputs]          = useState<Record<string, string>>({});
  const [runSaving,              setRunSaving]              = useState<string | null>(null);
  const [expandedRuns,           setExpandedRuns]           = useState<Set<string>>(new Set());
  const [expandedRunSections,    setExpandedRunSections]    = useState<Set<string>>(new Set());

  // Meetings state
  const [meetings,              setMeetings]              = useState<Meeting[]>([]);
  const [meetingsLoading,       setMeetingsLoading]       = useState(false);
  const [meetingFormOpen,       setMeetingFormOpen]       = useState(false);
  const [mtgType,               setMtgType]               = useState<MeetingType>("discovery_call");
  const [mtgStage,              setMtgStage]              = useState<MeetingStage>("scope_analysis");
  const [mtgDate,               setMtgDate]               = useState("");
  const [mtgNotes,              setMtgNotes]              = useState("");
  const [mtgSaving,             setMtgSaving]             = useState(false);
  const [mtgCompleteId,         setMtgCompleteId]         = useState<string | null>(null);
  const [mtgOutcome,            setMtgOutcome]            = useState<MeetingOutcome | "">("");

  // Atomic analysis gate — tracks whether the operator has explicitly run analysis
  // (or whether the lead already has analysis data from a previous session).
  // All analysis-derived sections are gated behind this flag.
  const [analysisEverRun, setAnalysisEverRun] = useState(false);

  // Workflow state
  const [overrideScopeWarning, setOverrideScopeWarning] = useState(false);
  const [contactStrategy,      setContactStrategy]      = useState<"bookings" | "teams" | "phone" | null>(null);
  const [showCallModal,        setShowCallModal]        = useState(false);
  const [intakePath,           setIntakePath]           = useState<IntakePath | null>(null);
  const [showRawInputs,        setShowRawInputs]        = useState(false);
  const [bootstrapDone,        setBootstrapDone]        = useState(false);

  // Proposal Engine state
  const [proposal,          setProposal]          = useState<Proposal | null>(null);
  const [proposalLoading,   setProposalLoading]   = useState(false);
  const [proposalSaving,    setProposalSaving]    = useState(false);
  const [proposalSaved,     setProposalSaved]     = useState(false);
  const [proposalError,     setProposalError]     = useState("");
  const [proposalOpen,      setProposalOpen]      = useState(false);
  const [autofillRunning,   setAutofillRunning]   = useState(false);
  const [autofillResult,    setAutofillResult]    = useState<{ confidence: string; confidence_reason: string; fields_updated: string[] } | null>(null);
  const [pdfGenerating,     setPdfGenerating]     = useState(false);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const result = await safeFetch<{ data: Lead }>(`/api/hub/leads/${id}`);
      if (!result.ok) {
        console.error("[fetchLead]", result.error);
        return;
      }
      const l = result.data.data;
      setLead(l);
      setStatus(l.status);
      setDiscoveryDepth(l.discovery_depth ?? "");
      setProposedHosting(l.proposed_hosting_required === true ? "yes" : l.proposed_hosting_required === false ? "no" : "");
      setProposedPlan(l.proposed_maintenance_plan ?? "");
      setReviewsIncluded(l.projects?.[0]?.reviews_included ?? 2);
      setNotes(l.lead_details?.internal_notes ?? "");
    } catch (err) {
      console.error("[fetchLead] unexpected:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  // ── Meetings fetch ──────────────────────────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    setMeetingsLoading(true);
    try {
      const result = await safeFetch<{ meetings: Meeting[] }>(`/api/hub/leads/${id}/meetings`);
      if (result.ok) setMeetings(result.data.meetings ?? []);
    } catch {
      // silent — non-critical
    } finally {
      setMeetingsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  async function scheduleMeeting() {
    if (!mtgDate) return;
    setMtgSaving(true);
    const result = await safeFetch<{ meeting: Meeting }>(`/api/hub/leads/${id}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: mtgType, stage: mtgStage, scheduled_at: mtgDate, notes: mtgNotes }),
    });
    setMtgSaving(false);
    if (result.ok) {
      setMeetingFormOpen(false);
      setMtgNotes("");
      setMtgDate("");
      fetchMeetings();
    }
  }

  async function completeMeeting(meetingId: string) {
    if (!mtgOutcome) return;
    setMtgSaving(true);
    await safeFetch(`/api/hub/leads/${id}/meetings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meeting_id: meetingId, completed_at: new Date().toISOString(), outcome: mtgOutcome }),
    });
    setMtgSaving(false);
    setMtgCompleteId(null);
    setMtgOutcome("");
    fetchMeetings();
  }

  const fetchEvents = useCallback(async (projectId: string) => {
    setEventsLoading(true);
    setEventsError("");
    try {
      const result = await safeFetch<{ events?: ProjectEvent[] }>(`/api/hub/projects/${projectId}/events`);
      if (!result.ok) {
        setEventsError("Could not load timeline. Please refresh and try again.");
        return;
      }
      setEvents(result.data.events ?? []);
    } catch {
      setEventsError("Could not load timeline. Please refresh and try again.");
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const projectId = lead?.projects?.[0]?.id;
  useEffect(() => { if (projectId) fetchEvents(projectId); }, [projectId, fetchEvents]);

  // ── Fetch revisions ────────────────────────────────────────────────────────────

  const fetchRevisions = useCallback(async (pId: string) => {
    setRevisionsLoading(true);
    setRevisionsError("");
    try {
      const result = await safeFetch<{ revisions?: RevisionItem[] }>(`/api/hub/projects/${pId}/revisions`);
      if (!result.ok) {
        setRevisionsError("Could not load revisions. Please refresh and try again.");
        return;
      }
      setRevisions(result.data.revisions ?? []);
    } catch {
      setRevisionsError("Could not load revisions. Please refresh and try again.");
    } finally {
      setRevisionsLoading(false);
    }
  }, []);

  useEffect(() => { if (projectId) fetchRevisions(projectId); }, [projectId, fetchRevisions]);

  // ── Fetch project context ─────────────────────────────────────────────────────

  const fetchContext = useCallback(async (pId: string) => {
    setContextLoading(true);
    try {
      const result = await safeFetch<{ context: ProjectContext | null }>(`/api/hub/projects/${pId}/context`);
      if (!result.ok) return;
      const ctx = result.data.context;
      setContext(ctx);
      if (ctx) {
        setCtxBusiness(ctx.business_summary ?? "");
        setCtxProject(ctx.project_summary ?? "");
        setCtxStack(ctx.current_stack ?? "");
        setCtxUrls(ctx.key_urls ?? "");
        setCtxConstraints(ctx.constraints ?? "");
        setCtxAiNotes(ctx.ai_notes ?? "");
        setCtxAcceptance(ctx.acceptance_notes ?? "");
      }
    } finally {
      setContextLoading(false);
    }
  }, []);

  useEffect(() => { if (projectId) fetchContext(projectId); }, [projectId, fetchContext]);

  // ── Fetch lead brief ──────────────────────────────────────────────────────────

  const fetchBrief = useCallback(async (leadId: string) => {
    setBriefLoading(true);
    try {
      const result = await safeFetch<{ brief: LeadBrief | null }>(`/api/hub/leads/${leadId}/brief`);
      if (!result.ok) return;
      const b = result.data.brief;
      setBrief(b);
      if (b) {
        setBriefReply(b.scoping_reply ?? "");
        setBriefSummary(b.project_summary ?? "");
        setBriefType(b.project_type ?? "");
        setBriefSolution(b.recommended_solution ?? "");
        setBriefPages(b.suggested_pages ?? "");
        setBriefFeatures(b.suggested_features ?? "");
        setBriefIntegrations(b.suggested_integrations ?? "");
        setBriefTimeline(b.timeline_estimate ?? "");
        setBriefBudget(b.budget_positioning ?? "");
        setBriefRisks(b.risks_and_unknowns ?? "");
        setBriefFollowUp(b.follow_up_questions ?? "");
        setBriefProposal(b.proposal_draft ?? "");
        setOverrideScopeWarning(b.override_scope_warning === true);
        if (b.contact_strategy === "bookings" || b.contact_strategy === "teams" || b.contact_strategy === "phone") {
          setContactStrategy(b.contact_strategy);
        }
        if (b.scope_ready === true) setScopeReady(true);
        else if (b.scope_ready === false) setScopeReady(false);
        if (b.readiness_reason) setReadinessReason(b.readiness_reason);
        if (b.intake_path === "clarification_email" || b.intake_path === "discovery_call" || b.intake_path === "proceed_to_brief") {
          setIntakePath(b.intake_path);
        }
        if (b.revision_context) setRevisionContext(b.revision_context);
        if (b.technical_research) setTechnicalResearch(b.technical_research as TechnicalResearch);
        if (b.technical_research_updated_at) setResearchUpdatedAt(b.technical_research_updated_at);
        if (b.complexity_result) setComplexityResult(b.complexity_result as ComplexityResult);

        // Backward compatibility: if the lead already has a full analysis pass
        // persisted from a previous session, mark the atomic gate as satisfied
        // so all sections render immediately without flash.
        const hasPriorAnalysis =
          (b.project_summary?.trim()?.length ?? 0) > 0 &&
          (b.project_type?.trim()?.length ?? 0) > 0 &&
          b.technical_research !== null &&
          b.complexity_result !== null;
        if (hasPriorAnalysis) setAnalysisEverRun(true);
      }
    } finally {
      setBriefLoading(false);
    }
  }, []);

  // Brief accessible from enquiry_received onward; full brief editing only at ready_for_proposal+
  const briefAccessible = ['enquiry_received', 'scope_analysis', 'ready_for_proposal', 'proposal_sent', 'client_approved', 'deposit_requested', 'in_build', 'client_review', 'revisions', 'final_approval', 'full_payment_requested', 'complete'].includes(status);
  const briefEligible = ['ready_for_proposal', 'proposal_sent', 'client_approved', 'deposit_requested', 'in_build', 'client_review', 'revisions', 'final_approval', 'full_payment_requested', 'complete'].includes(status);
  useEffect(() => { if (briefAccessible && id) fetchBrief(id); }, [briefAccessible, id, fetchBrief]);

  // ── Fetch proposal (scope_received+) ────────────────────────────────────────

  const fetchProposal = useCallback(async (leadId: string) => {
    setProposalLoading(true);
    setProposalError("");
    try {
      const result = await safeFetch<{ proposal: Proposal | null }>(`/api/hub/leads/${leadId}/proposal`);
      if (result.ok) {
        setProposal(result.data.proposal);
      }
    } finally {
      setProposalLoading(false);
    }
  }, []);

  useEffect(() => { if (briefEligible && id) fetchProposal(id); }, [briefEligible, id, fetchProposal]);

  async function createProposal() {
    if (!id) return;
    setProposalSaving(true);
    setProposalError("");
    const result = await safeFetch<{ proposal: Proposal }>(`/api/hub/leads/${id}/proposal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setProposalSaving(false);
    if (result.ok) {
      setProposal(result.data.proposal);
      setProposalOpen(true);
    } else {
      setProposalError(result.error);
    }
  }

  async function saveProposal(fields: Record<string, unknown>) {
    if (!id) return;
    setProposalSaving(true);
    setProposalSaved(false);
    const result = await safeFetch<{ proposal: Proposal }>(`/api/hub/leads/${id}/proposal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setProposalSaving(false);
    if (result.ok) {
      setProposal(result.data.proposal);
      setProposalSaved(true);
      setTimeout(() => setProposalSaved(false), 2000);
    } else {
      setProposalError(result.error);
    }
  }

  async function runProposalAutofill(force = false) {
    if (!id) return;
    setAutofillRunning(true);
    setAutofillResult(null);
    setProposalError("");
    const result = await safeFetch<{
      proposal: Proposal;
      autofill: { confidence: string; confidence_reason: string; fields_updated: string[]; skipped_reason?: string };
    }>(`/api/hub/leads/${id}/proposal/autofill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    setAutofillRunning(false);
    if (result.ok) {
      setProposal(result.data.proposal);
      setAutofillResult(result.data.autofill);
      if (result.data.autofill.fields_updated?.length > 0) {
        setProposalOpen(true);
      }
    } else {
      setProposalError(result.error);
    }
  }

  async function generateProposalPdf() {
    if (!id) return;
    setPdfGenerating(true);
    setProposalError("");
    const result = await safeFetch<{ pdf_url: string; proposal: Proposal }>(`/api/hub/leads/${id}/proposal/pdf`, {
      method: "POST",
    });
    setPdfGenerating(false);
    if (result.ok) {
      setProposal(result.data.proposal);
      window.open(result.data.pdf_url, "_blank");
    } else {
      setProposalError(result.error);
    }
  }

  // ── Bootstrap brief from enquiry data (early stages, fill-if-empty) ─────────

  const bootstrapBriefFromEnquiry = useCallback(async () => {
    if (!lead || !id || bootstrapDone) return;
    // Only bootstrap for early stages where there's no scoping reply yet
    if (!['enquiry_received', 'scope_analysis'].includes(status)) return;

    setBootstrapDone(true);

    // Build seed data from existing lead fields
    const seed: Record<string, string> = {};

    // Project type from engagement_type
    if (lead.engagement_type) {
      const typeMap: Record<string, string> = {
        new_website: "New website build",
        redesign: "Website redesign",
        ongoing_support: "Ongoing support & maintenance",
        consultation: "Consultation / discovery",
        other: "Custom engagement",
      };
      seed.project_type = typeMap[lead.engagement_type] ?? lead.engagement_type.replace(/_/g, " ");
    }

    // Budget positioning from budget
    if (lead.budget) {
      const budgetMap: Record<string, string> = {
        under_2k: "Under €2,000 — micro project",
        "2k_5k": "€2,000–€5,000 — small project",
        "5k_10k": "€5,000–€10,000 — standard project",
        "10k_20k": "€10,000–€20,000 — mid-range project",
        "20k_plus": "€20,000+ — large/enterprise project",
        not_sure: "Budget not yet defined — requires discovery",
      };
      seed.budget_positioning = budgetMap[lead.budget] ?? lead.budget.replace(/_/g, " ");
    }

    // Timeline estimate from timeline
    if (lead.timeline) {
      const timeMap: Record<string, string> = {
        asap: "ASAP — urgent delivery required",
        "1_month": "Within 1 month",
        "1_3_months": "1–3 months",
        "3_6_months": "3–6 months",
        flexible: "Flexible / no hard deadline",
      };
      seed.timeline_estimate = timeMap[lead.timeline] ?? lead.timeline.replace(/_/g, " ");
    }

    // Project summary from success definition + clarifier answers
    const summaryParts: string[] = [];
    if (lead.lead_details?.success_definition) {
      summaryParts.push(lead.lead_details.success_definition);
    }
    if (lead.lead_details?.clarifier_answers) {
      const answers = Object.values(lead.lead_details.clarifier_answers).filter(Boolean);
      if (answers.length > 0) summaryParts.push(answers.join("; "));
    }
    if (summaryParts.length > 0) {
      seed.project_summary = summaryParts.join("\n\n");
    }

    // Only seed fields that don't already have values
    const fieldsToSave: Record<string, string> = {};
    if (seed.project_type && !briefType) fieldsToSave.project_type = seed.project_type;
    if (seed.budget_positioning && !briefBudget) fieldsToSave.budget_positioning = seed.budget_positioning;
    if (seed.timeline_estimate && !briefTimeline) fieldsToSave.timeline_estimate = seed.timeline_estimate;
    if (seed.project_summary && !briefSummary) fieldsToSave.project_summary = seed.project_summary;

    if (Object.keys(fieldsToSave).length === 0) return;

    // Update local state
    if (fieldsToSave.project_type) setBriefType(fieldsToSave.project_type);
    if (fieldsToSave.budget_positioning) setBriefBudget(fieldsToSave.budget_positioning);
    if (fieldsToSave.timeline_estimate) setBriefTimeline(fieldsToSave.timeline_estimate);
    if (fieldsToSave.project_summary) setBriefSummary(fieldsToSave.project_summary);

    // Persist to DB
    await safeFetch(`/api/hub/leads/${id}/brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fieldsToSave),
    });
  }, [lead, id, status, bootstrapDone, briefType, briefBudget, briefTimeline, briefSummary]);

  // Trigger bootstrap after brief loads for early-stage leads
  useEffect(() => {
    if (briefAccessible && !briefLoading && lead && !bootstrapDone) {
      bootstrapBriefFromEnquiry();
    }
  }, [briefAccessible, briefLoading, lead, bootstrapDone, bootstrapBriefFromEnquiry]);

  // ── Stage-1 recommendation engine (deterministic) ───────────────────────────

  type Stage1Recommendation = {
    path: IntakePath;
    label: string;
    colour: "green" | "blue" | "amber";
    reason: string;
    confidence: "high" | "medium" | "low";
  };

  const stage1Recommendation = useMemo((): Stage1Recommendation | null => {
    if (!lead) return null;
    if (!['enquiry_received', 'scope_analysis'].includes(status)) return null;

    const totalScore = lead.total_score ?? 0;
    const complexity = lead.complexity_score ?? 0;
    const clarity = lead.clarity_score ?? 0;
    const authority = lead.authority_score ?? 0;
    const hasBudget = Boolean(lead.budget && lead.budget !== "not_sure");
    const hasTimeline = Boolean(lead.timeline);
    const hasSuccessDef = Boolean(lead.lead_details?.success_definition);
    const hasClarifiers = Boolean(lead.lead_details?.clarifier_answers && Object.keys(lead.lead_details.clarifier_answers).length > 0);

    // Detect complexity signals from clarifier answers and success definition
    const allText = [
      lead.lead_details?.success_definition ?? "",
      ...Object.values(lead.lead_details?.clarifier_answers ?? {}),
    ].join(" ").toLowerCase();

    const complexityKeywords = ["workflow", "integration", "api", "automation", "custom", "crm", "erp", "booking system", "portal", "dashboard", "login", "auth", "database", "multi-step", "inventory", "scheduling"];
    const complexityHits = complexityKeywords.filter(kw => allText.includes(kw)).length;
    const isComplex = complexity >= 4 || complexityHits >= 2;

    const isHighBudget = lead.budget === "10k_20k" || lead.budget === "20k_plus";
    const engagementType = lead.engagement_type ?? "";

    // ── Decision tree ──

    // Complex / operational / custom workflow → schedule call to gather info
    if (isComplex && (isHighBudget || engagementType === "consultation")) {
      return {
        path: "discovery_call",
        label: "Schedule a call to gather details",
        colour: "blue",
        reason: `Complex project (${complexityHits > 0 ? complexityHits + " workflow signals" : "high complexity score"}) with ${isHighBudget ? "significant budget" : "consultation engagement"} — a call will help align on scope.`,
        confidence: "high",
      };
    }
    if (isComplex) {
      return {
        path: "discovery_call",
        label: "Schedule a call to gather details",
        colour: "blue",
        reason: `Operational complexity detected (${complexityHits > 0 ? complexityKeywords.filter(kw => allText.includes(kw)).slice(0, 3).join(", ") : "high complexity score"}) — a call will surface requirements faster than email.`,
        confidence: "medium",
      };
    }

    // Strong enquiry, clear scope → proceed to brief
    if (totalScore >= 4 && clarity >= 4 && hasBudget && hasTimeline && hasSuccessDef) {
      return {
        path: "proceed_to_brief",
        label: "Proceed to proposal",
        colour: "green",
        reason: "Strong, clear enquiry with budget, timeline, and success criteria defined — ready to draft proposal.",
        confidence: "high",
      };
    }

    // Good data but not fully clear → scoping email
    if ((totalScore >= 3 || (hasBudget && hasTimeline)) && clarity >= 3) {
      return {
        path: "clarification_email",
        label: "Send scoping email",
        colour: "amber",
        reason: "Reasonable enquiry but needs targeted follow-up to fill scope gaps before proposing.",
        confidence: "medium",
      };
    }

    // Decent authority/budget but thin detail → scoping email
    if (hasBudget || authority >= 3 || hasClarifiers) {
      return {
        path: "clarification_email",
        label: "Send scoping email",
        colour: "amber",
        reason: "Some substance present but missing key project details — follow up with scoping questions.",
        confidence: "low",
      };
    }

    // Minimal data → scoping email (safest default)
    return {
      path: "clarification_email",
      label: "Send scoping email",
      colour: "amber",
      reason: "Insufficient data for confident recommendation — start with a scoping email to gather requirements.",
      confidence: "low",
    };
  }, [lead, status]);

  // ── Stage-1 path selection (persists intake_path + contact_strategy) ────────

  const [stage1Saving, setStage1Saving] = useState(false);

  async function selectStage1Path(path: IntakePath, strategy?: "bookings" | "teams" | "phone" | null) {
    setStage1Saving(true);
    setIntakePath(path);
    const patch: Record<string, unknown> = { intake_path: path };
    if (strategy !== undefined) {
      setContactStrategy(strategy);
      patch.contact_strategy = strategy;
    }
    await safeFetch(`/api/hub/leads/${id}/brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setStage1Saving(false);
  }

  // ── Microsoft Bookings URL (env-configurable) ──────────────────────────────

  const bookingsUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_BOOKINGS_URL ?? "")
    : "";

  // ── Merged client context ────────────────────────────────────────────────────
  // Single evolving source of truth from all customer-input sources.

  const mergedClientContext = useMemo(() => {
    if (!lead) return "";
    const sections: string[] = [];

    // 1. Client details
    const clientLines: string[] = [];
    clientLines.push(`Name: ${lead.contact_name ?? "Unknown"}`);
    if (lead.contact_email) clientLines.push(`Email: ${lead.contact_email}`);
    if (lead.company_name) clientLines.push(`Company: ${lead.company_name}`);
    if (lead.company_website) clientLines.push(`Website: ${lead.company_website}`);
    if (lead.role) clientLines.push(`Role: ${lead.role}`);
    if (lead.decision_authority) clientLines.push(`Decision authority: ${lead.decision_authority}`);
    if (lead.engagement_type) clientLines.push(`Engagement type: ${ENGAGEMENT_LABELS[lead.engagement_type] ?? lead.engagement_type}`);
    if (lead.budget) clientLines.push(`Budget range: ${BUDGET_LABELS[lead.budget] ?? lead.budget}`);
    if (lead.timeline) clientLines.push(`Timeline: ${TIMELINE_LABELS[lead.timeline] ?? lead.timeline}`);
    sections.push("## Client details\n" + clientLines.join("\n"));

    // 2. Intake clarifiers
    const clarifiers = lead.lead_details?.clarifier_answers;
    if (clarifiers && Object.keys(clarifiers).length > 0) {
      const lines = Object.entries(clarifiers).map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`);
      sections.push("## Intake clarifiers\n" + lines.join("\n"));
    }

    // 3. Client request
    if (lead.lead_details?.success_definition) {
      sections.push("## Client request\n" + lead.lead_details.success_definition);
    }

    // 3b. Current tools
    if (lead.lead_details?.current_tools) {
      sections.push("## Current tools\n" + lead.lead_details.current_tools);
    }

    // 4. Decision signals context (raw scores still useful for AI analysis)
    const sigLines: string[] = [];
    if (lead.total_score != null) sigLines.push(`Overall score: ${Number(lead.total_score).toFixed(1)}/5`);
    if (lead.clarity_score != null) sigLines.push(`Clarity: ${lead.clarity_score}/5`);
    if (lead.complexity_score != null) sigLines.push(`Complexity: ${lead.complexity_score}/5`);
    if (lead.budget) sigLines.push(`Budget: ${lead.budget === "not_sure" ? "not sure" : lead.budget}`);
    if (lead.timeline) sigLines.push(`Timeline: ${lead.timeline}`);
    if (sigLines.length > 0) sections.push("## Decision signals\n" + sigLines.join("\n"));

    // 5. Workflow state
    const workflowLines: string[] = [];
    if (intakePath) workflowLines.push(`Intake path: ${intakePath === "clarification_email" ? "Scoping email" : intakePath === "discovery_call" ? "Scoping call" : "Proceed to brief"}`);
    if (contactStrategy) workflowLines.push(`Contact strategy: ${contactStrategy === "bookings" ? "Microsoft Bookings" : contactStrategy === "teams" ? "Microsoft Teams" : "Phone call"}`);
    if (workflowLines.length > 0) sections.push("## Workflow state\n" + workflowLines.join("\n"));

    // 6. Call notes (from internal notes if call path)
    if (intakePath === "discovery_call" && lead.lead_details?.internal_notes) {
      sections.push("## Discovery call notes\n" + lead.lead_details.internal_notes);
    }

    // 7. Scoping reply (operator-entered or pasted client scoping response)
    if (briefReply.trim()) {
      sections.push("## Scoping reply\n" + briefReply.trim());
    }

    // 8. Clarification round replies (client Q&A exchanges)
    const answeredRoundsForContext = rounds.filter(r => (r.status === "replied" || r.status === "closed") && r.client_reply?.trim());
    if (answeredRoundsForContext.length > 0) {
      const roundLines = answeredRoundsForContext.map(r => {
        const lines: string[] = [];
        if (r.questions?.trim()) lines.push(`Questions sent:\n${r.questions.trim()}`);
        if (r.client_reply?.trim()) lines.push(`Client reply:\n${r.client_reply.trim()}`);
        return `### Round ${r.round_number}\n${lines.join("\n")}`;
      });
      sections.push("## Clarification rounds\n" + roundLines.join("\n\n"));
    }

    // 9. Revised information (operator-entered requirement changes / call notes)
    if (revisionContext.trim()) {
      sections.push("## Revised information\nIMPORTANT: The following updated requirements supersede any conflicting earlier information.\n" + revisionContext.trim());
    }

    // 10. Existing brief analysis (if any fields populated)
    const briefFields: string[] = [];
    if (briefSummary.trim()) briefFields.push(`Project summary: ${briefSummary.trim()}`);
    if (briefType.trim()) briefFields.push(`Project type: ${briefType.trim()}`);
    if (briefSolution.trim()) briefFields.push(`Recommended solution: ${briefSolution.trim()}`);
    if (briefPages.trim()) briefFields.push(`Suggested pages: ${briefPages.trim()}`);
    if (briefFeatures.trim()) briefFields.push(`Suggested features: ${briefFeatures.trim()}`);
    if (briefIntegrations.trim()) briefFields.push(`Suggested integrations: ${briefIntegrations.trim()}`);
    if (briefTimeline.trim()) briefFields.push(`Timeline estimate: ${briefTimeline.trim()}`);
    if (briefBudget.trim()) briefFields.push(`Budget positioning: ${briefBudget.trim()}`);
    if (briefRisks.trim()) briefFields.push(`Risks & unknowns: ${briefRisks.trim()}`);
    if (briefFollowUp.trim()) briefFields.push(`Follow-up questions: ${briefFollowUp.trim()}`);
    if (briefFields.length > 0) sections.push("## Existing brief analysis\n" + briefFields.join("\n"));

    return sections.join("\n\n");
  }, [lead, intakePath, contactStrategy, briefReply, rounds, briefSummary, briefType, briefSolution, briefPages, briefFeatures, briefIntegrations, briefTimeline, briefBudget, briefRisks, briefFollowUp, revisionContext]);

  // ── Pricing Engine (deterministic commercial recommendation) ─────────────────

  type DeliveryClass = "Brochure site" | "Business website" | "Growth website" | "Custom workflow build" | "Ops platform" | "Needs review";
  type PricingFit = "Tight" | "Feasible" | "Premium" | "Needs review";
  type RecommendedPackage = "Foundation" | "Growth" | "Accelerator" | "Custom System" | "Needs review";
  type PriceBand = "€3k–€5k" | "€5k–€8k" | "€8k–€12k" | "€12k+" | "Needs custom quote";
  type CommercialPosture = "Standard package" | "Custom quote required" | "Phased MVP recommended";

  type PricingRecommendation = {
    deliveryClass: DeliveryClass;
    pricingFit: PricingFit;
    package: RecommendedPackage;
    priceBand: PriceBand;
    rationale: string;
    confidence: "high" | "medium" | "low";
    // Custom-build split pricing (only present for complex/custom leads)
    isCustomSplit: boolean;
    commercialPosture?: CommercialPosture;
    fullScopeEstimate?: string;
    phase1Path?: string;
  };

  const pricingRecommendation = useMemo((): PricingRecommendation | null => {
    if (!lead) return null;

    // ── Signal extraction ──────────────────────────────────────────
    const complexity = lead.complexity_score ?? 0;
    const totalScore = lead.total_score ?? 0;
    const budget = lead.budget ?? "";
    const engagement = lead.engagement_type ?? "";
    const timeline = lead.timeline ?? "";

    // ── Analysis quality gate ──────────────────────────────────────
    // Detect weak/stale/placeholder analysis that should not drive pricing.
    // A trusted field must have ≥15 chars of meaningful content.
    const isTrusted = (v: string) => {
      const t = v.trim();
      if (t.length < 15) return false;
      // Reject obvious placeholder/bootstrap patterns
      if (/^(test|not_sure|nothing|n\/a|tbd|placeholder|unknown)/i.test(t)) return false;
      if (/^[^a-zA-Z]*$/.test(t)) return false; // no letters at all
      return true;
    };

    const trustedSummary = isTrusted(briefSummary);
    const trustedType = isTrusted(briefType);
    const trustedSolution = isTrusted(briefSolution);
    const hasAnyTrustedAnalysis = trustedSummary || trustedType || trustedSolution;

    // If no trusted analysis at all, fall back immediately
    if (!hasAnyTrustedAnalysis) {
      return {
        deliveryClass: "Needs review",
        pricingFit: "Needs review",
        package: "Needs review",
        priceBand: "Needs custom quote",
        rationale: "Insufficient or low-quality analysis to classify — run AI analysis or complete more client inputs before pricing.",
        confidence: "low",
        isCustomSplit: false,
      };
    }

    // Text analysis helpers — only use trusted fields for keyword detection
    const trustedFields = [
      trustedSummary ? briefSummary : "",
      trustedType ? briefType : "",
      trustedSolution ? briefSolution : "",
      isTrusted(briefIntegrations) ? briefIntegrations : "",
      isTrusted(briefFeatures) ? briefFeatures : "",
      isTrusted(briefPages) ? briefPages : "",
      isTrusted(briefRisks) ? briefRisks : "",
      isTrusted(briefBudget) ? briefBudget : "",
      isTrusted(briefTimeline) ? briefTimeline : "",
      isTrusted(briefFollowUp) ? briefFollowUp : "",
    ].join(" ").toLowerCase();

    // ── Complexity keyword detection ────────────────────────────────
    // Tier 1: Strong custom/system signals (each one alone implies custom scope)
    const strongSystemPatterns = /\b(booking.?engine|staff.?dashboard|admin.?panel|ops.?platform|operational.?system|custom.?workflow|customer.?portal|client.?portal|user.?portal|staff.?portal|migration.?complex|data.?migration|legacy.?system|gdpr|compliance|privacy.?requirement|uptime.?requirement|infrastructure.?complex|mvp.?recommend|phased.?approach|phase.?1|multi.?phase)\b/;
    const hasStrongSystemSignals = strongSystemPatterns.test(trustedFields);

    // Tier 2: Moderate complexity signals
    const hasWorkflowSignals = /\b(workflow|booking|dashboard|crm|portal|automation|scheduling|inventory|login|auth|user.?account|admin|multi.?step|ops|operational)\b/.test(trustedFields);
    const hasIntegrationSignals = /\b(api|integrat|stripe|payment|oauth|webhook|third.?party|zapier|hubspot|salesforce|xero|quickbooks|mailchimp|twilio|sendgrid|aws|azure|google.?cloud)\b/.test(trustedFields);
    const hasEcommerceSignals = /\b(e.?commerce|shop|store|cart|checkout|product.?catalog|woocommerce|shopify)\b/.test(trustedFields);

    // Tier 3: Standard signals
    const hasBrochureSignals = /\b(brochure|landing.?page|one.?page|simple.?site|informational|static.?site|portfolio)\b/.test(trustedFields);
    const hasGrowthSignals = /\b(blog|seo|content.?manage|cms|lead.?gen|marketing|growth|funnel|conversion)\b/.test(trustedFields);

    // Budget/scope tension detection from analysis text
    const hasBudgetTension = /\b(exceed|over.?budget|tight.?budget|budget.?tension|budget.?constraint|scope.?exceed|not.?feasible.?within|materially.?exceed|beyond.?budget|budget.?insufficient|budget.?challenge|reduce.?scope|mvp|minimum.?viable)\b/.test(trustedFields);
    const hasRiskComplexity = /\b(significant.?risk|high.?risk|complex|substantial|considerable|challenging|ambitious|migration|legacy|refactor|rewrite|overhaul)\b/.test(trustedFields);

    // Count complexity signal categories
    const complexitySignalCount = [hasStrongSystemSignals, hasWorkflowSignals, hasIntegrationSignals, hasEcommerceSignals].filter(Boolean).length;

    // Budget tier
    const budgetTier: number = budget === "under_3k" ? 1 : budget === "3k_5k" ? 2 : budget === "5k_15k" ? 3 : budget === "15k_40k" ? 4 : budget === "40k_plus" ? 5 : 0;

    // ── Delivery class determination (with guardrails) ──────────────
    let deliveryClass: DeliveryClass;

    // GUARDRAIL: Strong system signals always escalate to custom
    if (hasStrongSystemSignals) {
      deliveryClass = complexitySignalCount >= 3 || complexity >= 4 ? "Ops platform" : "Custom workflow build";
    }
    // Workflow + any other complexity → custom at minimum
    else if (hasWorkflowSignals && (hasIntegrationSignals || complexity >= 3 || hasRiskComplexity)) {
      deliveryClass = complexitySignalCount >= 3 ? "Ops platform" : "Custom workflow build";
    }
    // Workflow signals alone → custom workflow build
    else if (hasWorkflowSignals) {
      deliveryClass = "Custom workflow build";
    }
    // Integration signals with moderate complexity → at least growth
    else if (hasIntegrationSignals && (complexity >= 3 || hasRiskComplexity)) {
      deliveryClass = "Custom workflow build";
    }
    // E-commerce or integration + growth
    else if (hasEcommerceSignals || (hasIntegrationSignals && hasGrowthSignals)) {
      deliveryClass = "Growth website";
    }
    // Growth signals or moderate complexity
    else if (hasGrowthSignals || (complexity >= 3 && !hasBrochureSignals)) {
      deliveryClass = "Business website";
    }
    // Only classify as brochure if explicit brochure signals AND no complexity
    else if (hasBrochureSignals && complexity <= 2 && complexitySignalCount === 0) {
      deliveryClass = "Brochure site";
    }
    // Default to business website (not brochure)
    else {
      deliveryClass = "Business website";
    }

    // GUARDRAIL: Budget tension + complexity signals → force escalation
    if (hasBudgetTension && (deliveryClass === "Brochure site" || deliveryClass === "Business website")) {
      deliveryClass = hasWorkflowSignals || hasIntegrationSignals ? "Custom workflow build" : "Growth website";
    }

    // ── Package recommendation ──────────────────────────────────────
    let pkg: RecommendedPackage;
    if (deliveryClass === "Ops platform") {
      pkg = "Custom System";
    } else if (deliveryClass === "Custom workflow build") {
      pkg = "Accelerator";
    } else if (deliveryClass === "Growth website") {
      pkg = "Growth";
    } else if (deliveryClass === "Business website") {
      pkg = complexity >= 3 ? "Growth" : "Foundation";
    } else {
      pkg = "Foundation";
    }

    // ── Indicative price band ───────────────────────────────────────
    let priceBand: PriceBand;
    if (pkg === "Custom System") {
      priceBand = "€12k+";
    } else if (pkg === "Accelerator") {
      priceBand = "€8k–€12k";
    } else if (pkg === "Growth") {
      priceBand = "€5k–€8k";
    } else {
      priceBand = "€3k–€5k";
    }

    // GUARDRAIL: If budget tension detected and band is low, escalate band
    if (hasBudgetTension && (priceBand === "€3k–€5k" || priceBand === "€5k–€8k")) {
      priceBand = "Needs custom quote";
    }

    // ── Pricing fit (budget vs recommendation + analysis tension) ────
    let pricingFit: PricingFit;
    if (budgetTier === 0) {
      pricingFit = "Needs review";
    } else if (hasBudgetTension) {
      // Analysis itself says budget is tight → respect that
      pricingFit = "Tight";
    } else if (pkg === "Foundation" && budgetTier >= 2) {
      pricingFit = budgetTier >= 3 ? "Premium" : "Feasible";
    } else if (pkg === "Growth" && budgetTier >= 3) {
      pricingFit = budgetTier >= 4 ? "Premium" : "Feasible";
    } else if (pkg === "Accelerator" && budgetTier >= 3) {
      pricingFit = budgetTier >= 4 ? "Feasible" : "Tight";
    } else if (pkg === "Custom System" && budgetTier >= 4) {
      pricingFit = budgetTier >= 5 ? "Feasible" : "Tight";
    } else if (pkg === "Custom System" && budgetTier < 4) {
      pricingFit = "Tight";
    } else if (budgetTier >= 2) {
      pricingFit = "Feasible";
    } else {
      pricingFit = "Tight";
    }

    // ── Confidence ──────────────────────────────────────────────────
    const hasScoring = totalScore > 0;
    const confidence: "high" | "medium" | "low" =
      (hasAnyTrustedAnalysis && hasScoring && budgetTier > 0) ? "high"
      : (hasAnyTrustedAnalysis && (hasScoring || budgetTier > 0)) ? "medium"
      : "low";

    // ── Rationale ───────────────────────────────────────────────────
    const parts: string[] = [];
    parts.push(`Classified as ${deliveryClass.toLowerCase()} based on ${complexitySignalCount > 0 ? `${complexitySignalCount} complexity signal categories` : "scope analysis"}.`);
    if (hasStrongSystemSignals) {
      parts.push("Strong custom system indicators detected in analysis (e.g. booking engine, staff dashboard, portal, migration, MVP).");
    }
    if (hasBudgetTension) {
      parts.push("Analysis indicates scope may exceed stated budget — pricing fit marked as tight.");
    } else if (pricingFit === "Tight") {
      parts.push("Client budget may be tight for the recommended scope.");
    } else if (pricingFit === "Premium") {
      parts.push("Budget comfortably covers the recommended scope.");
    }
    if (hasRiskComplexity) {
      parts.push("Significant complexity or risk signals present in analysis.");
    }
    if (engagement === "tech_advice" || engagement === "ongoing_support") {
      parts.push(`Engagement type (${ENGAGEMENT_LABELS[engagement] ?? engagement}) may warrant retainer pricing instead.`);
    }
    if (timeline === "asap") {
      parts.push("Urgent timeline — consider rush premium.");
    }
    if (isTrusted(briefRisks)) {
      parts.push("Risks identified in analysis — review before confirming price.");
    }

    // ── Custom-build split pricing ──────────────────────────────────
    // For complex/custom delivery classes, split into full-scope vs phase-1/MVP
    const isCustomDelivery = deliveryClass === "Ops platform" || deliveryClass === "Custom workflow build";
    const isCustomSplit = isCustomDelivery && (hasStrongSystemSignals || hasBudgetTension || complexitySignalCount >= 2);

    if (!isCustomSplit) {
      return {
        deliveryClass, pricingFit, package: pkg, priceBand,
        rationale: parts.join(" "), confidence, isCustomSplit: false,
      };
    }

    // ── Commercial posture ─────────────────────────────────────────
    let commercialPosture: CommercialPosture;
    if (hasBudgetTension) {
      commercialPosture = "Phased MVP recommended";
    } else if (deliveryClass === "Ops platform" || complexitySignalCount >= 3) {
      commercialPosture = "Custom quote required";
    } else {
      commercialPosture = "Custom quote required";
    }

    // ── Full-scope estimate ────────────────────────────────────────
    // Derive from analysis text: look for explicit euro amounts in budget positioning
    const euroAmountPattern = /€\s?[\d,.]+k?\s*[–\-]\s*€?\s?[\d,.]+k?\+?/gi;
    const euroMatches = trustedFields.match(euroAmountPattern);
    // Also look for standalone amounts like "€35k+" or "€60,000"
    const standaloneEuroPattern = /€\s?[\d,.]+k?\+?/gi;
    const standaloneMatches = trustedFields.match(standaloneEuroPattern);

    let fullScopeEstimate: string;
    if (euroMatches && euroMatches.length > 0) {
      // Use the largest range found (likely the full-scope one)
      fullScopeEstimate = euroMatches[euroMatches.length - 1].replace(/\s+/g, "");
    } else if (deliveryClass === "Ops platform") {
      fullScopeEstimate = budgetTier >= 5 ? "€40k+" : budgetTier >= 4 ? "€25k–€60k+" : "€20k–€40k+";
    } else {
      // Custom workflow build
      fullScopeEstimate = budgetTier >= 4 ? "€15k–€40k" : "€12k–€25k";
    }

    // ── Phase 1 / MVP path ─────────────────────────────────────────
    let phase1Path: string;
    if (hasBudgetTension && budgetTier >= 3) {
      // Budget exists but is tight for full scope → MVP starts within budget
      phase1Path = budgetTier >= 4 ? "From €15k" : "From €8k–€12k";
    } else if (deliveryClass === "Ops platform") {
      phase1Path = "From €12k–€18k";
    } else {
      phase1Path = "From €8k–€12k";
    }

    // Override priceBand to not show the misleading single low band
    const adjustedPriceBand: PriceBand = "Needs custom quote";

    if (hasBudgetTension) {
      parts.push(`Full scope estimated at ${fullScopeEstimate} — phased MVP from ${phase1Path} may fit stated budget.`);
    }

    return {
      deliveryClass, pricingFit, package: pkg, priceBand: adjustedPriceBand,
      rationale: parts.join(" "), confidence, isCustomSplit: true,
      commercialPosture, fullScopeEstimate, phase1Path,
    };
  }, [lead, briefSummary, briefType, briefSolution, briefIntegrations, briefFeatures, briefPages, briefRisks, briefBudget, briefTimeline, briefFollowUp]);

  // ── Decision signals ─────────────────────────────────────────────────────────
  const decisionSignals = useDecisionSignals(lead, pricingRecommendation, stage1Recommendation);

  // ── Build Pricing Engine (deterministic, consumes complexity output) ────────
  // Locked day rate constant
  const OTWOONE_DAY_RATE = 565;

  // Budget range mapping (client stated budget → numeric range in euros)
  const BUDGET_RANGES: Record<string, { low: number; high: number }> = {
    under_3k:  { low: 0,     high: 3000 },
    "3k_5k":   { low: 3000,  high: 5000 },
    "5k_15k":  { low: 5000,  high: 15000 },
    "15k_40k": { low: 15000, high: 40000 },
    "40k_plus":{ low: 40000, high: 80000 },
  };

  type BuildPricingResult = {
    complexity_score: number;
    complexity_class: string;
    estimated_days_low: number;
    estimated_days_high: number;
    recommended_build_days: number;
    day_rate: number;
    recommended_build_price: number;
    confidence_range_low: number;
    confidence_range_high: number;
    client_budget_low: number | null;
    client_budget_high: number | null;
    budget_gap_low: number | null;
    budget_gap_high: number | null;
    commercial_strategy: string;
    pricing_rationale: string;
  };

  const buildPricing = useMemo((): BuildPricingResult | null => {
    // Continuity: only compute when complexity result exists
    if (!complexityResult || complexityResult.complexity_score === 0) return null;

    const daysLow = complexityResult.estimated_days_low;
    const daysHigh = complexityResult.estimated_days_high;
    const recommendedDays = Math.round((daysLow + daysHigh) / 2);
    const recommendedPrice = recommendedDays * OTWOONE_DAY_RATE;
    const confidenceLow = daysLow * OTWOONE_DAY_RATE;
    const confidenceHigh = daysHigh * OTWOONE_DAY_RATE;

    // Client budget extraction
    const budgetKey = lead?.budget ?? "";
    const budgetRange = BUDGET_RANGES[budgetKey] ?? null;
    const clientBudgetLow = budgetRange?.low ?? null;
    const clientBudgetHigh = budgetRange?.high ?? null;

    // Budget gap (positive = over budget, negative = under budget)
    const budgetGapLow = clientBudgetLow !== null ? recommendedPrice - clientBudgetHigh! : null;
    const budgetGapHigh = clientBudgetHigh !== null ? recommendedPrice - clientBudgetLow! : null;

    // Commercial strategy (deterministic)
    let commercialStrategy: string;
    if (clientBudgetHigh === null) {
      commercialStrategy = "No stated budget — custom quote required";
    } else if (recommendedPrice <= clientBudgetHigh) {
      commercialStrategy = "Within stated budget";
    } else if (recommendedPrice <= clientBudgetHigh * 1.3) {
      commercialStrategy = "Scope adjustment or phased MVP recommended";
    } else {
      commercialStrategy = "Full scope exceeds stated budget; consider phased delivery";
    }

    // Rationale referencing complexity signals
    const signalNames = (complexityResult.detected_signals ?? []).map((s: { key: string }) => s.key.replace(/_/g, " ")).join(", ");
    const rationale = `${recommendedDays} recommended build days (midpoint of ${daysLow}–${daysHigh}) at €${OTWOONE_DAY_RATE}/day = €${recommendedPrice.toLocaleString()}. ` +
      `Complexity ${Math.min(complexityResult.complexity_score, 100)}/100 (${(complexityResult.complexity_class ?? "unknown").replace(/_/g, " ")}). ` +
      (signalNames ? `Detected signals: ${signalNames}.` : "No complexity signals detected.");

    return {
      complexity_score: complexityResult.complexity_score,
      complexity_class: complexityResult.complexity_class,
      estimated_days_low: daysLow,
      estimated_days_high: daysHigh,
      recommended_build_days: recommendedDays,
      day_rate: OTWOONE_DAY_RATE,
      recommended_build_price: recommendedPrice,
      confidence_range_low: confidenceLow,
      confidence_range_high: confidenceHigh,
      client_budget_low: clientBudgetLow,
      client_budget_high: clientBudgetHigh,
      budget_gap_low: budgetGapLow,
      budget_gap_high: budgetGapHigh,
      commercial_strategy: commercialStrategy,
      pricing_rationale: rationale,
    };
  }, [complexityResult, lead?.budget]);

  // Operator override for build price
  const [buildPriceOverride, setBuildPriceOverride] = useState<string>("");
  const effectiveBuildPrice = buildPricing
    ? (buildPriceOverride.trim() && !isNaN(Number(buildPriceOverride)) ? Number(buildPriceOverride) : buildPricing.recommended_build_price)
    : 0;

  // ── Monthly Operating Cost Engine (deterministic, consumes research output) ───────────
  // Extracts infrastructure / tool costs from technical research and adds
  // OTwoOne support retainer to produce a total monthly operating cost.

  const OTWOONE_SUPPORT_RETAINER = 295; // €/month

  type RunningCostItem = {
    name: string;
    low: number;
    high: number;
    source: string; // category it came from
    relevance: string;
  };

  type RunningCostsResult = {
    items: RunningCostItem[];
    support_retainer: number;
    total_low: number;
    total_high: number;
    total_with_retainer_low: number;
    total_with_retainer_high: number;
    rationale: string;
  };

  /** Round to nearest whole euro for clean operator display */
  function roundCost(val: number): number {
    return Math.round(val);
  }

  /**
   * Parse monthly cost from pricing strings like "€0–€25/month", "€25/mo", "$10-$20 per month".
   * IMPORTANT: Only matches values with explicit monthly context (month, mo, /m, monthly).
   * Rejects values that look like per-user, per-event, annual, or one-time costs.
   * Applies a sanity cap of €500/month per individual item to avoid misparses.
   */
  const MONTHLY_COST_CAP = 500; // €/month — individual item sanity cap

  function parseMonthlyCost(pricing?: string): { low: number; high: number } | null {
    if (!pricing) return null;
    const text = pricing.toLowerCase();

    // Reject pricing strings that are clearly not monthly recurring
    if (/\b(per\s*user|per\s*seat|per\s*event|per\s*request|one.?time|annual|yearly|per\s*year|\/year)\b/i.test(text)) {
      return null;
    }

    // Require explicit monthly context somewhere in the string
    const hasMonthlyContext = /\/(month|mo|m)\b|per\s*month|monthly/i.test(pricing);
    if (!hasMonthlyContext) return null;

    // Range: €0–€25/month, €10-€20/mo, $5 – $15/month
    const rangeMatch = pricing.match(/[€$]\s*(\d[\d,]*(?:\.\d+)?)\s*[-–—]\s*[€$]?\s*(\d[\d,]*(?:\.\d+)?)/);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1].replace(/,/g, ""));
      const high = parseFloat(rangeMatch[2].replace(/,/g, ""));
      if (!isNaN(low) && !isNaN(high) && high <= MONTHLY_COST_CAP) {
        return { low, high };
      }
      // If high exceeds cap, still return capped value if low is reasonable
      if (!isNaN(low) && low <= MONTHLY_COST_CAP) {
        return { low, high: Math.min(high, MONTHLY_COST_CAP) };
      }
      return null;
    }

    // Single value: €25/month, $10/mo
    const singleMatch = pricing.match(/[€$]\s*(\d[\d,]*(?:\.\d+)?)/);
    if (singleMatch) {
      const val = parseFloat(singleMatch[1].replace(/,/g, ""));
      if (!isNaN(val) && val <= MONTHLY_COST_CAP) return { low: val, high: val };
      return null;
    }

    return null;
  }

  const runningCosts = useMemo((): RunningCostsResult | null => {
    // Use technicalResearch state directly — always the latest from research route.
    // brief?.technical_research can be stale until next fetchBrief call.
    const research = technicalResearch;
    if (!research) return null;

    const items: RunningCostItem[] = [];

    // Primary source: operating_cost_estimate category
    if (research.operating_cost_estimate?.items?.length) {
      for (const item of research.operating_cost_estimate.items) {
        const cost = parseMonthlyCost(item.pricing);
        if (cost) {
          items.push({
            name: item.name,
            low: cost.low,
            high: cost.high,
            source: "operating_cost_estimate",
            relevance: item.relevance ?? "likely",
          });
        }
      }
    }

    // Fallback: if operating_cost_estimate is empty, extract from infrastructure + third_party_services
    if (items.length === 0) {
      const fallbackCategories: Array<{ key: string; cat: typeof research.infrastructure }> = [
        { key: "infrastructure", cat: research.infrastructure },
        { key: "third_party_services", cat: research.third_party_services },
      ];
      for (const { key, cat } of fallbackCategories) {
        if (cat?.items?.length) {
          for (const item of cat.items) {
            const cost = parseMonthlyCost(item.pricing);
            if (cost && (cost.low > 0 || cost.high > 0)) {
              items.push({
                name: item.name,
                low: cost.low,
                high: cost.high,
                source: key,
                relevance: item.relevance ?? "likely",
              });
            }
          }
        }
      }
    }

    // Deduplicate by name (same service can appear in multiple categories)
    const seen = new Set<string>();
    const deduped: RunningCostItem[] = [];
    for (const item of items) {
      const key = item.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    // Round individual item costs for clean display
    for (const item of deduped) {
      item.low = roundCost(item.low);
      item.high = roundCost(item.high);
    }

    const totalLow = roundCost(deduped.reduce((sum, i) => sum + i.low, 0));
    const totalHigh = roundCost(deduped.reduce((sum, i) => sum + i.high, 0));

    // Always return a valid result when research exists — even if zero items.
    // Zero items means "no recurring infrastructure costs identified", which is
    // a valid analysis outcome, not a pipeline failure.
    const rationale = deduped.length > 0
      ? `${deduped.length} recurring cost${deduped.length !== 1 ? "s" : ""} extracted from technical research. ` +
        `Infrastructure/tool costs: €${totalLow.toLocaleString()}–€${totalHigh.toLocaleString()}/month. ` +
        `OTwoOne support retainer: €${OTWOONE_SUPPORT_RETAINER}/month. ` +
        `Total: €${(totalLow + OTWOONE_SUPPORT_RETAINER).toLocaleString()}–€${(totalHigh + OTWOONE_SUPPORT_RETAINER).toLocaleString()}/month.`
      : `No recurring infrastructure or third-party costs identified in technical research. ` +
        `OTwoOne support retainer: €${OTWOONE_SUPPORT_RETAINER}/month.`;

    return {
      items: deduped,
      support_retainer: OTWOONE_SUPPORT_RETAINER,
      total_low: totalLow,
      total_high: totalHigh,
      total_with_retainer_low: totalLow + OTWOONE_SUPPORT_RETAINER,
      total_with_retainer_high: totalHigh + OTWOONE_SUPPORT_RETAINER,
      rationale,
    };
  }, [technicalResearch]);

  // ── Atomic Analysis Gate ─────────────────────────────────────────────────────
  // All analysis-derived outputs must be present together or none are shown.
  // This prevents showing isolated fragments (e.g. complexity without costs).
  // The flag is true when: (a) operator has explicitly run analysis AND the full
  // chain completed, OR (b) the lead already has prior analysis data on load.
  const analysisPassComplete = useMemo(() => {
    if (!analysisEverRun) return false;
    const hasBriefAnalysis = briefSummary.trim().length > 0 && briefType.trim().length > 0;
    const hasComplexity = complexityResult !== null && complexityResult.complexity_score > 0;
    const hasResearch = technicalResearch !== null;
    const hasBuildPricing = buildPricing !== null;
    const hasRunningCosts = runningCosts !== null;
    return hasBriefAnalysis && hasComplexity && hasResearch && hasBuildPricing && hasRunningCosts;
  }, [analysisEverRun, briefSummary, briefType, complexityResult, technicalResearch, buildPricing, runningCosts]);

  // ── Save lead brief ───────────────────────────────────────────────────────────

  async function saveBrief() {
    setBriefSaving(true);
    setBriefSaved(false);
    const result = await safeFetch<{ brief: LeadBrief }>(`/api/hub/leads/${id}/brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scoping_reply: briefReply,
        project_summary: briefSummary,
        project_type: briefType,
        recommended_solution: briefSolution,
        suggested_pages: briefPages,
        suggested_features: briefFeatures,
        suggested_integrations: briefIntegrations,
        timeline_estimate: briefTimeline,
        budget_positioning: briefBudget,
        risks_and_unknowns: briefRisks,
        follow_up_questions: briefFollowUp,
        proposal_draft: briefProposal,
        override_scope_warning: overrideScopeWarning,
        contact_strategy: contactStrategy,
        scope_ready: scopeReady,
        readiness_reason: readinessReason,
        intake_path: intakePath,
      }),
    });
    setBriefSaving(false);
    if (result.ok) {
      setBrief(result.data.brief);
      setBriefSaved(true);
      setTimeout(() => setBriefSaved(false), 2000);
    }
  }

  // ── Auto-fill brief from AI ──────────────────────────────────────────────────

  async function autofillBrief(includeRounds = false, skipConfirm = false) {
    // Confirm if fields already populated (skip during unified recompute)
    const hasContent = briefSummary.trim() || briefType.trim() || briefSolution.trim();
    if (!skipConfirm && hasContent && !window.confirm("This will overwrite the current brief fields with AI analysis. Continue?")) return;

    setAutofillLoading(true);
    setAutofillError("");

    // Send merged context + upstream signals for consultant brief synthesis
    const body: Record<string, unknown> = {
      scoping_reply: briefReply || "(No direct scoping reply — see merged context)",
      merged_context: mergedClientContext,
    };

    // Always include answered clarification rounds
    const answeredRounds = rounds.filter((r) => r.status === "replied" || r.status === "closed");
    if (answeredRounds.length > 0) {
      body.clarification_rounds = answeredRounds.map((r) => ({
        round_number: r.round_number,
        questions: r.questions,
        client_reply: r.client_reply,
      }));
    }

    // Pass pricing engine signals so the consultant brief is commercially grounded
    if (pricingRecommendation && pricingRecommendation.deliveryClass !== "Needs review") {
      body.pricing_signals = {
        deliveryClass: pricingRecommendation.deliveryClass,
        package: pricingRecommendation.package,
        priceBand: pricingRecommendation.priceBand,
        pricingFit: pricingRecommendation.pricingFit,
        rationale: pricingRecommendation.rationale,
        confidence: pricingRecommendation.confidence,
        isCustomSplit: pricingRecommendation.isCustomSplit,
        ...(pricingRecommendation.commercialPosture && { commercialPosture: pricingRecommendation.commercialPosture }),
        ...(pricingRecommendation.fullScopeEstimate && { fullScopeEstimate: pricingRecommendation.fullScopeEstimate }),
        ...(pricingRecommendation.phase1Path && { phase1Path: pricingRecommendation.phase1Path }),
      };
    }

    // Pass complexity engine signals so the consultant brief reflects effort/scope reality
    if (complexityResult && complexityResult.complexity_score > 0) {
      body.complexity_signals = {
        complexity_score: complexityResult.complexity_score,
        complexity_class: complexityResult.complexity_class,
        detected_signals: complexityResult.detected_signals,
        build_components: complexityResult.build_components,
        estimated_days_low: complexityResult.estimated_days_low,
        estimated_days_high: complexityResult.estimated_days_high,
        complexity_rationale: complexityResult.complexity_rationale,
      };
    }

    const result = await safeFetch<{
      fields: Record<string, string>;
      ready: boolean;
      readiness_reason: string;
    }>(`/api/hub/leads/${id}/brief/autofill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setAutofillLoading(false);

    if (!result.ok) {
      setAutofillError(result.error);
      return;
    }

    const { fields, ready, readiness_reason } = result.data;
    // Coerce to string — Claude may return arrays/objects for some fields
    const str = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : String(v));
    setBriefSummary(str(fields.project_summary));
    setBriefType(str(fields.project_type));
    setBriefSolution(str(fields.recommended_solution));
    setBriefPages(str(fields.suggested_pages));
    setBriefFeatures(str(fields.suggested_features));
    setBriefIntegrations(str(fields.suggested_integrations));
    setBriefTimeline(str(fields.timeline_estimate));
    setBriefBudget(str(fields.budget_positioning));
    setBriefRisks(str(fields.risks_and_unknowns));
    setBriefFollowUp(str(fields.follow_up_questions));
    setScopeReady(ready);
    setReadinessReason(readiness_reason);
  }

  async function runResearch(skipConfirm = false) {
    if (!skipConfirm && technicalResearch && !window.confirm("This will overwrite the current research with a fresh analysis. Continue?")) return;

    setResearchLoading(true);
    setResearchError("");

    const result = await safeFetch<{ research: TechnicalResearch; updated_at: string }>(
      `/api/hub/leads/${id}/brief/research`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merged_context: mergedClientContext }),
      },
    );

    setResearchLoading(false);

    if (!result.ok) {
      setResearchError(result.error);
      return;
    }

    setTechnicalResearch(result.data.research);
    setResearchUpdatedAt(result.data.updated_at);
  }

  // ── Run Complexity Engine (consumes upstream structured outputs) ────────────

  const runComplexity = useCallback(async () => {
    setComplexityLoading(true);
    setComplexityError("");

    const result = await safeFetch<ComplexityResult>(
      `/api/hub/leads/${id}/brief/complexity`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send raw context as fallback only — route prioritises DB-stored structured outputs
        body: JSON.stringify({ merged_context: mergedClientContext }),
      },
    );

    setComplexityLoading(false);

    if (!result.ok) {
      setComplexityError(result.error);
      return;
    }

    setComplexityResult(result.data);

    // Persist to DB so page reload doesn't flash (eliminates auto-run delay).
    safeFetch(`/api/hub/leads/${id}/brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complexity_result: result.data }),
    });
  }, [id, mergedClientContext]);

  // ── Auto-run Complexity when upstream structured outputs change ─────────────
  // Triggers when: brief fields saved, research updated, or clarification rounds change.
  // Uses a fingerprint of key upstream values to detect meaningful changes.
  // Debounced via a short timeout so rapid saves don't fire multiple API calls.

  const complexityFingerprint = useMemo(() => {
    const parts = [
      briefSummary.trim().slice(0, 100),
      briefType.trim(),
      briefFeatures.trim().slice(0, 100),
      briefIntegrations.trim().slice(0, 100),
      researchUpdatedAt ?? "",
      rounds.filter(r => r.status === "replied" || r.status === "closed").length.toString(),
    ];
    return parts.join("|");
  }, [briefSummary, briefType, briefFeatures, briefIntegrations, researchUpdatedAt, rounds]);

  // Track whether initial load is complete to avoid running on mount
  const [complexityAutoReady, setComplexityAutoReady] = useState(false);
  useEffect(() => {
    // Mark ready after initial brief load completes (brief exists or is null after fetch)
    if (briefAccessible && !briefLoading) {
      const timer = setTimeout(() => setComplexityAutoReady(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [briefAccessible, briefLoading]);

  useEffect(() => {
    // Only auto-run after initial load, when there's enough upstream data
    if (!complexityAutoReady) return;
    if (!briefAccessible) return;
    if (complexityLoading) return;
    // Suppress during unified recompute — applyRevision() runs complexity explicitly
    if (revisionApplying) return;
    // Atomic analysis gate: never auto-run complexity unless operator has
    // explicitly triggered analysis at least once. This prevents isolated
    // complexity fragments appearing before a full analysis pass.
    if (!analysisEverRun) return;
    // Need at least brief summary or research to produce meaningful scores
    if (!briefSummary.trim() && !researchUpdatedAt) return;

    const timer = setTimeout(() => {
      runComplexity();
    }, 600); // debounce — wait for rapid field changes to settle

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complexityFingerprint, complexityAutoReady, briefAccessible, revisionApplying, analysisEverRun]);

  // ── Unified recompute: Apply revised information ────────────────────────────
  // Persists revision_context, then re-runs the full downstream chain in sequence:
  // research → analysis (autofill) → complexity auto-triggers → build pricing + monthly cost cascade

  async function applyRevision() {
    const text = revisionDraft.trim();
    if (!text) return;

    setRevisionApplying(true);

    // 1. Persist revision_context
    setRevisionContext(text);
    const saveResult = await safeFetch<{ brief: LeadBrief }>(`/api/hub/leads/${id}/brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision_context: text }),
    });
    if (saveResult.ok) {
      setBrief(saveResult.data.brief);
    }

    // 2. Re-run technical research (consumes updated mergedClientContext which now includes revision_context)
    // Note: mergedClientContext will update on next render due to revisionContext state change.
    // We need to pass the updated context explicitly since state won't have propagated yet.
    setResearchLoading(true);
    setResearchError("");
    const researchResult = await safeFetch<{ research: TechnicalResearch; updated_at: string }>(
      `/api/hub/leads/${id}/brief/research`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Build inline context with revision text appended, since state hasn't propagated yet
        body: JSON.stringify({ merged_context: mergedClientContext + "\n\n## Revised information\nIMPORTANT: The following updated requirements supersede any conflicting earlier information.\n" + text }),
      },
    );
    setResearchLoading(false);
    if (researchResult.ok) {
      setTechnicalResearch(researchResult.data.research);
      setResearchUpdatedAt(researchResult.data.updated_at);
    }

    // 3. Re-run consultant brief analysis (consumes updated context + research)
    setAutofillLoading(true);
    setAutofillError("");
    const answeredRounds = rounds.filter((r) => r.status === "replied" || r.status === "closed");
    const autofillBody: Record<string, unknown> = {
      scoping_reply: briefReply || "(No direct scoping reply — see merged context)",
      merged_context: mergedClientContext + "\n\n## Revised information\nIMPORTANT: The following updated requirements supersede any conflicting earlier information.\n" + text,
    };
    if (answeredRounds.length > 0) {
      autofillBody.clarification_rounds = answeredRounds.map((r) => ({
        round_number: r.round_number,
        questions: r.questions,
        client_reply: r.client_reply,
      }));
    }
    if (pricingRecommendation && pricingRecommendation.deliveryClass !== "Needs review") {
      autofillBody.pricing_signals = {
        deliveryClass: pricingRecommendation.deliveryClass,
        package: pricingRecommendation.package,
        priceBand: pricingRecommendation.priceBand,
        pricingFit: pricingRecommendation.pricingFit,
        rationale: pricingRecommendation.rationale,
        confidence: pricingRecommendation.confidence,
        isCustomSplit: pricingRecommendation.isCustomSplit,
      };
    }
    // Complexity signals from current result (will be refreshed after autofill completes)
    if (complexityResult && complexityResult.complexity_score > 0) {
      autofillBody.complexity_signals = {
        complexity_score: complexityResult.complexity_score,
        complexity_class: complexityResult.complexity_class,
        detected_signals: complexityResult.detected_signals,
        build_components: complexityResult.build_components,
        estimated_days_low: complexityResult.estimated_days_low,
        estimated_days_high: complexityResult.estimated_days_high,
        complexity_rationale: complexityResult.complexity_rationale,
      };
    }
    const autofillResult = await safeFetch<{
      fields: Record<string, string>;
      ready: boolean;
      readiness_reason: string;
    }>(`/api/hub/leads/${id}/brief/autofill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(autofillBody),
    });
    setAutofillLoading(false);
    if (autofillResult.ok) {
      const { fields, ready, readiness_reason } = autofillResult.data;
      const str = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : String(v));
      const newSummary = str(fields.project_summary);
      const newType = str(fields.project_type);
      const newSolution = str(fields.recommended_solution);
      const newPages = str(fields.suggested_pages);
      const newFeatures = str(fields.suggested_features);
      const newIntegrations = str(fields.suggested_integrations);
      const newTimeline = str(fields.timeline_estimate);
      const newBudget = str(fields.budget_positioning);
      const newRisks = str(fields.risks_and_unknowns);
      const newFollowUp = str(fields.follow_up_questions);

      setBriefSummary(newSummary);
      setBriefType(newType);
      setBriefSolution(newSolution);
      setBriefPages(newPages);
      setBriefFeatures(newFeatures);
      setBriefIntegrations(newIntegrations);
      setBriefTimeline(newTimeline);
      setBriefBudget(newBudget);
      setBriefRisks(newRisks);
      setBriefFollowUp(newFollowUp);
      setScopeReady(ready);
      setReadinessReason(readiness_reason);

      // 3b. Persist updated brief fields to DB so complexity route reads fresh data
      await safeFetch(`/api/hub/leads/${id}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_summary: newSummary || null,
          project_type: newType || null,
          recommended_solution: newSolution || null,
          suggested_pages: newPages || null,
          suggested_features: newFeatures || null,
          suggested_integrations: newIntegrations || null,
          timeline_estimate: newTimeline || null,
          budget_positioning: newBudget || null,
          risks_and_unknowns: newRisks || null,
          follow_up_questions: newFollowUp || null,
          scope_ready: ready,
          readiness_reason: readiness_reason,
        }),
      });
    }

    // 4. Run complexity explicitly — do NOT rely on debounce effect which may fire
    //    from intermediate state during the chain. This ensures complexity reads the
    //    final refreshed DB state (latest research + latest brief + latest revision_context).
    await runComplexity();
    //    Build Pricing cascades from complexityResult via useMemo.
    //    Monthly Operating Cost already updated from technicalResearch state set in step 2.

    setRevisionApplying(false);
    setRevisionDraft(""); // clear draft after successful apply
  }

  // ── Fetch iteration log entries ──────────────────────────────────────────────

  async function fetchIterations() {
    setIterationsLoading(true);
    const result = await safeFetch<{ iterations: LeadIteration[] }>(`/api/hub/leads/${id}/iterations`);
    setIterationsLoading(false);
    if (result.ok) setIterations(result.data.iterations);
  }

  // ── Revision Execution ───────────────────────────────────────────────────

  async function fetchLeadRevisions() {
    const result = await safeFetch<{ revisions: LeadRevisionRecord[] }>(`/api/hub/leads/${id}/revisions`);
    if (result.ok) {
      setLeadRevisions(result.data.revisions);
      // Fetch runs for all revisions
      for (const rev of result.data.revisions) {
        const runsResult = await safeFetch<{ runs: ExecutionRun[] }>(`/api/hub/leads/${id}/revisions/${rev.id}/runs`);
        if (runsResult.ok) {
          setExecutionRuns(prev => {
            const filtered = prev.filter(r => r.revision_id !== rev.id);
            return [...filtered, ...runsResult.data.runs];
          });
        }
      }
    }
  }

  async function saveExecutionRun(revisionId: string, batchIndex: number) {
    const key = `${revisionId}-${batchIndex}`;
    const report = runReportInputs[key]?.trim();
    if (!report || report.length < 10) return;
    setRunSaving(key);
    const result = await safeFetch<{ run: ExecutionRun }>(
      `/api/hub/leads/${id}/revisions/${revisionId}/runs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_index: batchIndex,
          output_report: report,
          operator_note: runNoteInputs[key]?.trim() || "",
        }),
      },
    );
    setRunSaving(null);
    if (result.ok) {
      setExecutionRuns(prev => [result.data.run, ...prev]);
      setRunReportInputs(prev => ({ ...prev, [key]: "" }));
      setRunNoteInputs(prev => ({ ...prev, [key]: "" }));
    }
  }

  async function updateRunQA(revisionId: string, runId: string, updates: { qa_status?: string; qa_notes?: string }) {
    const result = await safeFetch<{ run: ExecutionRun }>(
      `/api/hub/leads/${id}/revisions/${revisionId}/runs/${runId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      },
    );
    if (result.ok) {
      setExecutionRuns(prev => prev.map(r => r.id === runId ? result.data.run : r));
    }
  }

  async function generateRevisionPlan() {
    const feedback = leadRevFeedback.trim();
    if (!feedback || feedback.length < 10) return;
    setLeadRevGenerating(true);
    setLeadRevError("");

    const result = await safeFetch<{ revision: LeadRevisionRecord }>(
      `/api/hub/leads/${id}/revisions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_feedback: feedback }),
      },
    );

    setLeadRevGenerating(false);
    if (result.ok) {
      setLeadRevisions(prev => [result.data.revision, ...prev]);
      setLeadRevFeedback("");
    } else {
      setLeadRevError(result.error);
    }
  }

  async function updateBatchTriage(revisionId: string, batchIndex: number, updates: { priority?: string; effort?: string; status?: string; operator_note?: string; objective?: string; implementation_notes?: string; open_questions?: string[]; acceptance_criteria?: string[] }) {
    const result = await safeFetch<{ revision: LeadRevisionRecord }>(
      `/api/hub/leads/${id}/revisions/${revisionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_index: batchIndex, ...updates }),
      },
    );
    if (result.ok) {
      setLeadRevisions(prev => prev.map(r => r.id === revisionId ? result.data.revision : r));
    }
  }

  async function generateExecutionTask(revisionId: string, batchIndex: number) {
    setTaskGenerating(true);
    setTaskCopied(false);
    const result = await safeFetch<{ prompt: string }>(
      `/api/hub/leads/${id}/revisions/${revisionId}/task`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_index: batchIndex }),
      },
    );
    setTaskGenerating(false);
    if (result.ok) {
      setTaskPrompt(result.data.prompt);
    }
  }

  // ── Unified Analysis Pipeline ─────────────────────────────────────────────
  // Single-action pipeline: research → analysis (autofill) → complexity
  // Build pricing + monthly running costs cascade automatically via useMemo.
  // Used by both "Run analysis" and "Refresh analysis" buttons.

  async function runUnifiedAnalysis(extraContext?: string) {
    setUnifiedRunning(true);
    setAnalysisEverRun(true);

    // Build full context including iterations
    const iterationText = iterations.length > 0
      ? "\n\n## Iteration log\n" + iterations.map(it =>
          `[${it.source_type}${it.source_date ? ` — ${it.source_date}` : ""}] ${it.notes}`
        ).join("\n")
      : "";
    const contextWithIterations = mergedClientContext + iterationText + (extraContext ? `\n\n## New information\n${extraContext}` : "");

    // 1. Run technical research
    setResearchLoading(true);
    setResearchError("");
    const researchResult = await safeFetch<{ research: TechnicalResearch; updated_at: string }>(
      `/api/hub/leads/${id}/brief/research`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merged_context: contextWithIterations }),
      },
    );
    setResearchLoading(false);
    if (researchResult.ok) {
      setTechnicalResearch(researchResult.data.research);
      setResearchUpdatedAt(researchResult.data.updated_at);
    }

    // 2. Run complexity (reads research from DB — must run before autofill so
    //    the consultant brief has complexity signals on the very first run)
    setComplexityLoading(true);
    setComplexityError("");
    const complexityFetchResult = await safeFetch<ComplexityResult>(
      `/api/hub/leads/${id}/brief/complexity`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merged_context: contextWithIterations }),
      },
    );
    setComplexityLoading(false);
    let freshComplexity: ComplexityResult | null = null;
    if (complexityFetchResult.ok) {
      freshComplexity = complexityFetchResult.data;
      setComplexityResult(freshComplexity);
      // Persist to DB so page reload doesn't flash
      safeFetch(`/api/hub/leads/${id}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complexity_result: freshComplexity }),
      });
    } else {
      setComplexityError(complexityFetchResult.error);
    }

    // 3. Run consultant brief analysis (autofill) — now has complexity signals
    setAutofillLoading(true);
    setAutofillError("");
    const autofillBody: Record<string, unknown> = {
      scoping_reply: "(See merged context)",
      merged_context: contextWithIterations,
    };
    if (pricingRecommendation && pricingRecommendation.deliveryClass !== "Needs review") {
      autofillBody.pricing_signals = {
        deliveryClass: pricingRecommendation.deliveryClass,
        package: pricingRecommendation.package,
        priceBand: pricingRecommendation.priceBand,
        pricingFit: pricingRecommendation.pricingFit,
        rationale: pricingRecommendation.rationale,
        confidence: pricingRecommendation.confidence,
        isCustomSplit: pricingRecommendation.isCustomSplit,
      };
    }
    // Use freshly computed complexity (not stale React state) so the
    // autofill always receives complexity signals — even on the first run
    const cxForAutofill = freshComplexity ?? complexityResult;
    if (cxForAutofill && cxForAutofill.complexity_score > 0) {
      autofillBody.complexity_signals = {
        complexity_score: cxForAutofill.complexity_score,
        complexity_class: cxForAutofill.complexity_class,
        detected_signals: cxForAutofill.detected_signals,
        build_components: cxForAutofill.build_components,
        estimated_days_low: cxForAutofill.estimated_days_low,
        estimated_days_high: cxForAutofill.estimated_days_high,
        complexity_rationale: cxForAutofill.complexity_rationale,
      };
    }
    const autofillResult = await safeFetch<{
      fields: Record<string, string>;
      ready: boolean;
      readiness_reason: string;
    }>(`/api/hub/leads/${id}/brief/autofill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(autofillBody),
    });
    setAutofillLoading(false);
    if (autofillResult.ok) {
      const { fields, ready, readiness_reason } = autofillResult.data;
      const str = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : String(v));
      const newSummary = str(fields.project_summary);
      const newType = str(fields.project_type);
      const newSolution = str(fields.recommended_solution);
      const newPages = str(fields.suggested_pages);
      const newFeatures = str(fields.suggested_features);
      const newIntegrations = str(fields.suggested_integrations);
      const newTimeline = str(fields.timeline_estimate);
      const newBudget = str(fields.budget_positioning);
      const newRisks = str(fields.risks_and_unknowns);
      const newFollowUp = str(fields.follow_up_questions);

      setBriefSummary(newSummary);
      setBriefType(newType);
      setBriefSolution(newSolution);
      setBriefPages(newPages);
      setBriefFeatures(newFeatures);
      setBriefIntegrations(newIntegrations);
      setBriefTimeline(newTimeline);
      setBriefBudget(newBudget);
      setBriefRisks(newRisks);
      setBriefFollowUp(newFollowUp);
      setScopeReady(ready);
      setReadinessReason(readiness_reason);

      // Persist brief to DB
      await safeFetch(`/api/hub/leads/${id}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_summary: newSummary || null,
          project_type: newType || null,
          recommended_solution: newSolution || null,
          suggested_pages: newPages || null,
          suggested_features: newFeatures || null,
          suggested_integrations: newIntegrations || null,
          timeline_estimate: newTimeline || null,
          budget_positioning: newBudget || null,
          risks_and_unknowns: newRisks || null,
          follow_up_questions: newFollowUp || null,
          scope_ready: ready,
          readiness_reason: readiness_reason,
        }),
      });
    }

    setUnifiedRunning(false);
  }

  // ── Add iteration and refresh analysis ────────────────────────────────────

  async function addIteration() {
    const notes = iterNotes.trim();
    if (!notes || notes.length < 5) return;
    setIterSaving(true);

    const result = await safeFetch<{ iteration: LeadIteration }>(`/api/hub/leads/${id}/iterations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_type: iterSourceType,
        source_date: iterSourceDate || null,
        notes,
      }),
    });

    if (result.ok) {
      setIterations(prev => [...prev, result.data.iteration]);
      setIterNotes("");
      setIterSourceDate("");
    }

    setIterSaving(false);
  }

  async function addIterationAndRefresh() {
    const notes = iterNotes.trim();
    if (!notes || notes.length < 5) return;
    setIterSaving(true);

    const result = await safeFetch<{ iteration: LeadIteration }>(`/api/hub/leads/${id}/iterations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_type: iterSourceType,
        source_date: iterSourceDate || null,
        notes,
      }),
    });

    if (result.ok) {
      setIterations(prev => [...prev, result.data.iteration]);
      setIterNotes("");
      setIterSourceDate("");

      // Only recompute the full pipeline if analysis has been run before.
      // This prevents "Add Information" from being a back-door analysis trigger.
      await runUnifiedAnalysis(notes);
    }

    setIterSaving(false);
  }

  async function startClarificationFromAutofill() {
    if (!briefFollowUp.trim()) return;
    setRoundSaving("new");
    try {
      const res = await fetch(`/api/hub/leads/${id}/clarifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: briefFollowUp }),
      });
      const json = await res.json() as { data?: ClarificationRound };
      if (json.data) {
        // Save the questions to the new round
        await fetch(`/api/hub/leads/${id}/clarifications/${json.data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: briefFollowUp }),
        });
        setExpandedRound(json.data.id);
      }
      await fetchRounds();
    } finally {
      setRoundSaving(null);
    }
  }

  // ── Select intake path (persists immediately) ─────────────────────────────────

  async function selectIntakePath(path: IntakePath) {
    setIntakePath(path);
    await safeFetch(`/api/hub/leads/${id}/brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intake_path: path }),
    });
  }

  // ── Build scoping call prep prompt ──────────────────────────────────────────

  function buildDiscoveryCallPrep(): string {
    if (!lead) return "";
    const lines: string[] = [];
    lines.push("## Discovery Call Preparation Pack");
    lines.push("");
    lines.push("### Client overview");
    lines.push(`Name: ${lead.contact_name ?? "Unknown"}`);
    if (lead.company_name) lines.push(`Company: ${lead.company_name}`);
    if (lead.company_website) lines.push(`Website: ${lead.company_website}`);
    if (lead.engagement_type) lines.push(`Engagement: ${ENGAGEMENT_LABELS[lead.engagement_type] ?? lead.engagement_type}`);
    if (lead.budget) lines.push(`Budget: ${BUDGET_LABELS[lead.budget] ?? lead.budget}`);
    if (lead.timeline) lines.push(`Timeline: ${TIMELINE_LABELS[lead.timeline] ?? lead.timeline}`);
    lines.push("");
    if (briefSummary.trim()) {
      lines.push("### AI brief summary");
      lines.push(briefSummary.trim());
      lines.push("");
    }
    if (readinessReason) {
      lines.push(`### Readiness assessment: ${scopeReady ? "Ready" : "Needs clarification"}`);
      lines.push(readinessReason);
      lines.push("");
    }
    if (briefFollowUp.trim()) {
      lines.push("### Key questions to ask on the call");
      lines.push(briefFollowUp.trim());
      lines.push("");
    }
    if (briefRisks.trim()) {
      lines.push("### Risks & unknowns to discuss");
      lines.push(briefRisks.trim());
      lines.push("");
    }
    lines.push("### Suggested call agenda");
    lines.push("1. Introductions and rapport building");
    lines.push("2. Confirm project goals and vision");
    lines.push("3. Walk through scope gaps / follow-up questions");
    lines.push("4. Discuss timeline and budget expectations");
    lines.push("5. Agree on next steps");
    return lines.join("\n");
  }

  // ── Build clarification email pack ────────────────────────────────────────────

  function buildClarificationEmailContent(): string {
    if (!lead) return "";
    const firstName = (lead.contact_name ?? "").split(" ")[0] || "there";
    const lines: string[] = [];
    lines.push(`Hi ${firstName},`);
    lines.push("");
    lines.push("Thanks for getting back to me with the scoping details — really helpful to see where you're at.");
    lines.push("");
    lines.push("I've reviewed everything and have a few follow-up questions before I put together a formal proposal:");
    lines.push("");
    if (briefFollowUp.trim()) {
      const questions = briefFollowUp.trim().split(/\n/).filter(q => q.trim());
      questions.forEach((q, i) => {
        const cleaned = q.replace(/^\d+[\.\)]\s*/, "").replace(/^[-•]\s*/, "").trim();
        if (cleaned) lines.push(`${i + 1}. ${cleaned}`);
      });
    } else {
      lines.push("1. [Follow-up question]");
    }
    lines.push("");
    lines.push("No rush — whenever suits. Once I have these, I'll have everything I need to draft the proposal.");
    lines.push("");
    lines.push("Best,");
    lines.push("Phil");
    return lines.join("\n");
  }

  // ── Build proposal prompt (consultant brief is primary, raw context is supporting) ──

  function buildBriefPrompt(): string {
    if (!lead) return "";
    const s = (v: unknown) => String(v ?? "").trim();
    const lines: string[] = [];

    // ── Use proposal-facing values where available, fall back to brief ──
    const propPrice = proposal?.build_price != null ? Number(proposal.build_price) : effectiveBuildPrice;
    const propDeposit = proposal?.deposit_percent ?? 50;
    const propTimeline = s(proposal?.timeline_summary) || s(briefTimeline);
    const propSummary = s(proposal?.executive_summary) || s(briefSummary);
    const propSolution = s(proposal?.recommended_solution) || s(briefSolution);
    const propValidUntil = s(proposal?.valid_until);
    const propPaymentNotes = s(proposal?.payment_notes) || "Bank details provided on invoice. Deposit required to secure build slot.";
    const clientName = s(lead.contact_name)?.split(" ")[0] || "there";
    const companyName = s(lead.company_name);
    const monthlyLow = runningCosts?.total_with_retainer_low;
    const monthlyHigh = runningCosts?.total_with_retainer_high;

    // ── Helper: strip known tech/tool names from text for client-facing narrative ──
    const TECH_TERMS = /\b(Next\.js|React|React Native|Supabase|PostgreSQL|Expo|Stripe|Clerk|Resend|Cloudflare R2|Vercel|Node\.js|TypeScript|Tailwind|TailwindCSS|REST API|GraphQL|Docker|Redis|AWS|Firebase|MongoDB)\b/gi;
    function stripTech(text: string): string {
      // Remove tech terms and clean up artefacts (double spaces, orphaned parens, semicolons)
      return text
        .replace(TECH_TERMS, "")
        .replace(/\([^)]*\)/g, (m) => { const inner = m.replace(TECH_TERMS, "").replace(/[,;]\s*[,;]/g, ",").replace(/^\(\s*[,;]?\s*\)$/, ""); return inner === "()" || inner === "( )" ? "" : inner; })
        .replace(/:\s*[,;.]\s*/g, ": ")
        .replace(/\s{2,}/g, " ")
        .replace(/ ([,;.])/g, "$1")
        .trim();
    }

    // ════════════════════════════════════════════════════════════════════
    // LAYER 1 — CLIENT-FACING NARRATIVE (clean, commercial, no tech)
    // ════════════════════════════════════════════════════════════════════

    lines.push("Write a professional proposal email from OTwoOne (a web consultancy in Ireland) to the client.");
    lines.push("");

    lines.push("## Client");
    lines.push(`Name: ${clientName}`);
    if (companyName) lines.push(`Company: ${companyName}`);
    lines.push("");

    lines.push("## Project overview");
    if (propSummary) lines.push(stripTech(propSummary));
    lines.push("");

    if (propSolution) {
      lines.push("## Recommended approach");
      lines.push(stripTech(propSolution));
      lines.push("");
    }

    if (propTimeline) {
      lines.push("## Timeline");
      lines.push(stripTech(propTimeline));
      lines.push("");
    }

    lines.push("## Commercial terms");
    lines.push(`- Build price: €${propPrice.toLocaleString()}`);
    lines.push(`- Deposit: ${propDeposit}% (€${Math.round(propPrice * propDeposit / 100).toLocaleString()}) to begin`);
    lines.push(`- Balance: ${100 - propDeposit}% on completion`);
    if (monthlyLow != null && monthlyHigh != null) {
      lines.push(`- Estimated monthly running cost: €${monthlyLow.toLocaleString()}${monthlyLow !== monthlyHigh ? `–€${monthlyHigh.toLocaleString()}` : ""}/mo (hosting, tools, support)`);
    }
    if (propValidUntil) lines.push(`- Valid until: ${propValidUntil}`);
    lines.push(`- Payment: ${propPaymentNotes}`);
    lines.push("");

    lines.push("## Instructions");
    lines.push(`- Address the client as "${clientName}"`);
    lines.push("- Professional but approachable tone");
    lines.push("- Keep it concise — aim for a single-page email");
    lines.push("- Focus on outcomes and deliverables, not technical implementation");
    lines.push("- End with a clear next step: deposit to secure the build slot");
    lines.push("- Do not include technical stack, tool names, or internal analysis in the proposal");
    lines.push("- Sign off as Phil from OTwoOne");

    // ════════════════════════════════════════════════════════════════════
    // LAYER 2 — INTERNAL CONTEXT (hidden from output)
    // ════════════════════════════════════════════════════════════════════

    const internalLines: string[] = [];

    // Technical stack from the raw solution/brief
    if (propSolution && TECH_TERMS.test(propSolution)) {
      TECH_TERMS.lastIndex = 0; // reset regex state
      const techMatches = [...new Set(propSolution.match(TECH_TERMS) || [])];
      if (techMatches.length > 0) {
        internalLines.push(`Technical stack: ${techMatches.join(", ")}`);
      }
    }

    // Complexity context
    if (complexityResult && complexityResult.complexity_score > 0) {
      internalLines.push(`Complexity: ${Math.min(complexityResult.complexity_score, 100)}/100 (${complexityResult.complexity_class.replace(/_/g, " ")}), estimated ${complexityResult.estimated_days_low}–${complexityResult.estimated_days_high} days`);
    }

    // Build pricing context
    if (buildPricing) {
      internalLines.push(`Build pricing basis: ${buildPricing.recommended_build_days} days × €${buildPricing.day_rate}/day`);
      if (buildPricing.commercial_strategy) {
        internalLines.push(`Commercial strategy: ${buildPricing.commercial_strategy}`);
      }
    }

    // Running costs breakdown
    if (runningCosts && runningCosts.items.length > 0) {
      internalLines.push(`Monthly cost breakdown: ${runningCosts.items.map(i => `${i.name} €${i.low}${i.low !== i.high ? `–€${i.high}` : ""}`).join(", ")}; support retainer €${runningCosts.support_retainer}`);
    }

    // Raw solution (with tech names) for context
    if (propSolution && internalLines.length > 0) {
      internalLines.push("");
      internalLines.push("Full technical solution context:");
      internalLines.push(propSolution);
    }

    if (internalLines.length > 0) {
      lines.push("");
      lines.push("## Internal context (do not include in output)");
      lines.push("Use this section only to understand scope, complexity, and delivery reality.");
      lines.push("Do NOT mention specific technologies, tools, or implementation details in the proposal unless the client explicitly requested them.");
      lines.push("");
      lines.push(...internalLines);
    }

    return lines.join("\n");
  }

  // ── Save project context ──────────────────────────────────────────────────────

  async function saveContext(pId: string) {
    setContextSaving(true);
    setContextSaved(false);
    const result = await safeFetch<{ context: ProjectContext }>(`/api/hub/projects/${pId}/context`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_summary: ctxBusiness,
        project_summary: ctxProject,
        current_stack: ctxStack,
        key_urls: ctxUrls,
        constraints: ctxConstraints,
        ai_notes: ctxAiNotes,
        acceptance_notes: ctxAcceptance,
      }),
    });
    setContextSaving(false);
    if (result.ok) {
      setContext(result.data.context);
      setContextSaved(true);
      setTimeout(() => setContextSaved(false), 2000);
    }
  }

  // ── Generate execution pack ──────────────────────────────────────────────────

  async function generateExecutionPack(pId: string) {
    setExecPackLoading(true);
    try {
      const result = await safeFetch<{ pack: ExecutionPack }>(`/api/hub/projects/${pId}/execution-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!result.ok) {
        setExecPack(null);
        return;
      }
      setExecPack(result.data.pack);
    } finally {
      setExecPackLoading(false);
    }
  }

  // ── Build ChatGPT Architect Prompt ────────────────────────────────────────────

  function buildChatGptPrompt(pack: ExecutionPack): string {
    const lines: string[] = [];
    lines.push("You are an implementation architect for a web project. Review the following execution pack and produce a structured implementation plan that can be handed directly to Claude Code for execution.");
    lines.push("");
    lines.push("## Project");
    lines.push(`Name: ${pack.project_name ?? "Unnamed project"}`);
    lines.push(`ID: ${pack.project_id}`);
    lines.push(`Generated: ${new Date(pack.generated_at).toLocaleString()}`);
    if (pack.batch_label) lines.push(`Batch: ${pack.batch_label}`);
    lines.push("");

    if (pack.context.business_summary || pack.context.project_summary || pack.context.current_stack) {
      lines.push("## Project Context");
      if (pack.context.business_summary) lines.push(`Business: ${pack.context.business_summary}`);
      if (pack.context.project_summary) lines.push(`Project: ${pack.context.project_summary}`);
      if (pack.context.current_stack) lines.push(`Stack: ${pack.context.current_stack}`);
      if (pack.context.key_urls) lines.push(`Key URLs: ${pack.context.key_urls}`);
      if (pack.context.constraints) lines.push(`Constraints: ${pack.context.constraints}`);
      if (pack.context.ai_notes) lines.push(`AI Notes: ${pack.context.ai_notes}`);
      lines.push("");
    }

    lines.push(`## Revision Items (${pack.summary.total_items} total)`);
    for (const group of pack.revisions_by_type) {
      lines.push(`### ${group.type} (${group.count})`);
      for (const item of group.items) {
        lines.push(`- [${item.priority.toUpperCase()}] ${item.title}`);
        if (item.description) lines.push(`  ${item.description}`);
      }
      lines.push("");
    }

    if (pack.context.acceptance_notes) {
      lines.push("## Acceptance Criteria");
      lines.push(pack.context.acceptance_notes);
      lines.push("");
    }

    lines.push("## Your Task");
    lines.push("1. Analyse each revision item");
    lines.push("2. Group related changes into logical implementation steps");
    lines.push("3. Identify dependencies between steps");
    lines.push("4. For each step, describe:");
    lines.push("   - What files need to change");
    lines.push("   - What the change involves");
    lines.push("   - Any risk or consideration");
    lines.push("5. Output a numbered implementation plan in the format Claude Code can execute directly");
    lines.push("");
    lines.push("Keep the plan concrete, scoped, and actionable. Do not add features not listed in the revision items.");

    return lines.join("\n");
  }

  // ── Build Claude Code Execution Prompt ────────────────────────────────────────

  function buildClaudePrompt(pack: ExecutionPack): string {
    const lines: string[] = [];
    lines.push(`You are working on the production codebase for ${pack.project_name ?? "this project"}.`);
    lines.push("");

    if (pack.context.business_summary || pack.context.project_summary || pack.context.current_stack) {
      lines.push("## Project Context");
      if (pack.context.business_summary) lines.push(`Business: ${pack.context.business_summary}`);
      if (pack.context.project_summary) lines.push(`Project: ${pack.context.project_summary}`);
      if (pack.context.current_stack) lines.push(`Stack: ${pack.context.current_stack}`);
      if (pack.context.key_urls) lines.push(`Key URLs: ${pack.context.key_urls}`);
      if (pack.context.ai_notes) lines.push(`AI Notes: ${pack.context.ai_notes}`);
      lines.push("");
    }

    lines.push("## Implementation Task");
    lines.push("Execute the following revision items as a single coordinated change:");
    lines.push("");

    for (const group of pack.revisions_by_type) {
      lines.push(`### ${group.type} (${group.count} item${group.count !== 1 ? 's' : ''})`);
      for (const item of group.items) {
        lines.push(`- **${item.title}** [${item.priority}]`);
        if (item.description) lines.push(`  ${item.description}`);
      }
      lines.push("");
    }

    if (pack.context.constraints) {
      lines.push("## Technical Constraints");
      lines.push(pack.context.constraints);
      lines.push("");
    }

    if (pack.context.acceptance_notes) {
      lines.push("## Acceptance Criteria");
      lines.push(pack.context.acceptance_notes);
      lines.push("");
    }

    lines.push("## Instructions");
    lines.push("- Implement each item completely");
    lines.push("- Maintain existing code patterns and architecture");
    lines.push("- Run TypeScript check and build when done");
    lines.push("- Report any issues encountered");

    return lines.join("\n");
  }

  // ── Create revision ────────────────────────────────────────────────────────────

  async function createRevision(pId: string) {
    if (!revAddTitle.trim()) return;
    setRevSaving(true);
    setRevisionsError("");
    try {
      const result = await safeFetch<{ revision: RevisionItem }>(`/api/hub/projects/${pId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: revAddTitle.trim(),
          description: revAddDesc.trim(),
          revision_type: revAddType,
          priority: revAddPriority,
          source: revAddSource,
          feedback_event_id: revAddFeedbackId,
        }),
      });
      if (!result.ok) {
        setRevisionsError(result.error);
        return;
      }
      setRevAddTitle("");
      setRevAddDesc("");
      setRevAddType("other");
      setRevAddPriority("medium");
      setRevAddSource("internal");
      setRevAddFeedbackId(null);
      setRevAddOpen(false);
      fetchRevisions(pId);
    } catch {
      setRevisionsError("Could not create revision. Please try again.");
    } finally {
      setRevSaving(false);
    }
  }

  // ── Update revision field ──────────────────────────────────────────────────────

  async function updateRevision(pId: string, revId: string, fields: Record<string, unknown>) {
    const result = await safeFetch(`/api/hub/projects/${pId}/revisions/${revId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!result.ok) {
      setRevisionsError("Could not update revision. Please refresh and try again.");
    }
    fetchRevisions(pId);
  }

  // ── Feedback → revision prefill ────────────────────────────────────────────────

  function prefillRevisionFromFeedback(ev: ProjectEvent) {
    const message = ev.meta?.message as string ?? '';
    const category = ev.meta?.category as string ?? '';
    const title = category
      ? `[${category}] ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`
      : message.slice(0, 80) + (message.length > 80 ? '…' : '');
    setRevAddTitle(title);
    setRevAddDesc(message);
    setRevAddSource("portal");
    setRevAddType(category === 'bug' ? 'bug' : category === 'design' ? 'design' : category === 'copy' ? 'copy' : 'other');
    setRevAddPriority(ev.meta?.priority as string ?? 'medium');
    setRevAddFeedbackId(ev.id);
    setRevAddOpen(true);
  }

  // ── Generate execution batch ──────────────────────────────────────────────────

  async function generateBatch(pId: string) {
    setBatchLoading(true);
    try {
      const result = await safeFetch<{ batch?: ExecutionBatch }>(`/api/hub/projects/${pId}/revisions/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!result.ok) {
        setBatchOutput(`Error: ${result.error}`);
        return;
      }
      setBatchOutput(JSON.stringify(result.data.batch, null, 2));
    } catch {
      setBatchOutput("Error: Could not generate batch. Please refresh and try again.");
    } finally {
      setBatchLoading(false);
    }
  }

  // ── Clarification rounds ───────────────────────────────────────────────────

  const fetchRounds = useCallback(async () => {
    setRoundsLoading(true);
    try {
      const res  = await fetch(`/api/hub/leads/${id}/clarifications`);
      const json = await res.json() as { data?: ClarificationRound[] };
      const list = json.data ?? [];
      setRounds(list);
      // seed draft buffers from server state
      const qBuf: Record<string, string> = {};
      const rBuf: Record<string, string> = {};
      for (const r of list) {
        qBuf[r.id] = r.questions ?? "";
        rBuf[r.id] = r.client_reply ?? "";
      }
      setDraftQuestions(qBuf);
      setDraftReplies(rBuf);
    } finally {
      setRoundsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchIterations(); }, [id]);
  useEffect(() => { fetchLeadRevisions(); }, [id]);

  async function createRound() {
    setRoundSaving("new");
    try {
      const res  = await fetch(`/api/hub/leads/${id}/clarifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json() as { data?: ClarificationRound };
      if (json.data) {
        setExpandedRound(json.data.id);
      }
      await fetchRounds();
    } finally {
      setRoundSaving(null);
    }
  }

  async function saveRound(roundId: string, fields: Record<string, unknown>) {
    setRoundSaving(roundId);
    try {
      await fetch(`/api/hub/leads/${id}/clarifications/${roundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      await fetchRounds();
    } finally {
      setRoundSaving(null);
    }
  }

  async function deleteRound(roundId: string) {
    if (!window.confirm("Delete this draft round?")) return;
    setRoundSaving(roundId);
    try {
      await fetch(`/api/hub/leads/${id}/clarifications/${roundId}`, { method: "DELETE" });
      await fetchRounds();
    } finally {
      setRoundSaving(null);
    }
  }

  function buildClarificationEmail(round: ClarificationRound): string {
    const name = lead?.contact_name ?? "there";
    const qs   = round.questions?.trim() ?? "";
    return `Hi ${name},\n\nThanks for the details so far. Before I put the proposal together, I just need to clarify a few things:\n\n${qs}\n\nNo rush — a quick reply whenever suits.\n\nThanks,\nPhilip`;
  }

  // ── Save lead fields ──────────────────────────────────────────────────────────

  async function saveField(fields: Record<string, unknown>) {
    setSaving(true);
    await safeFetch(`/api/hub/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    await safeFetch(`/api/hub/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internal_notes: notes }),
    });
    setSaving(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  // ── Send portal link ─────────────────────────────────────────────────────────

  async function sendPortalLink(projectId: string) {
    if (portalSending) return;
    setPortalSending(true);
    setPortalError("");
    try {
      const result = await safeFetch<{ ok?: boolean; intake_url?: string }>(`/api/hub/projects/${projectId}/send-intake`, { method: "POST" });
      if (!result.ok) {
        setPortalError(result.error);
        return;
      }
      setPortalUrl(result.data.intake_url ?? "");
      setPortalSent(true);
    } catch {
      setPortalError("Could not send portal link. Please refresh and try again.");
    } finally {
      setPortalSending(false);
    }
  }

  // ── View intake ──────────────────────────────────────────────────────────────

  async function toggleIntake(projectId: string) {
    if (intakeOpen) {
      setIntakeOpen(false);
      return;
    }
    setIntakeOpen(true);
    if (intakeData) return; // already loaded — show cached
    setIntakeLoading(true);
    setIntakeError("");
    try {
      const result = await safeFetch<IntakeApiResponse>(`/api/hub/projects/${projectId}/intake`);
      if (!result.ok) {
        setIntakeError("Could not load intake data. Please refresh and try again.");
        return;
      }
      setIntakeData(result.data);
    } catch {
      setIntakeError("Could not load intake data. Please refresh and try again.");
    } finally {
      setIntakeLoading(false);
    }
  }

  // ── Project field update (generic) ───────────────────────────────────────────

  async function saveProjectField(pId: string, fields: Record<string, unknown>) {
    setSaving(true);
    await safeFetch(`/api/hub/projects/${pId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setSaving(false);
  }

  // ── Project status update ─────────────────────────────────────────────────────

  async function updateProjectStatus(projectId: string, newStatus: string) {
    setSaving(true);
    const result = await safeFetch<{ error?: string }>(`/api/hub/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_status: newStatus }),
    });
    setSaving(false);
    if (!result.ok && result.status === 409) {
      setReviewLimitError(result.error);
      return;
    }
    setReviewLimitError("");
    fetchLead();
    fetchEvents(projectId);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center">
        <p className="text-sm text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center">
        <p className="text-sm text-red-400">Lead not found.</p>
      </div>
    );
  }

  const project     = lead.projects?.[0] ?? null;
  const isConverted = lead.status === "complete";
  const canActivateDeposit = lead.status === "deposit_requested" || lead.status === "client_approved";
  const meetingHint = meetingNextAction(status, meetings);

  return (
    <div className="min-h-screen bg-[#05060a] text-gray-200">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center gap-4">
        <Link href="/hub" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Hub
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-white">
            {lead.company_name || lead.contact_name || lead.contact_email}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {lead.engagement_type ? (ENGAGEMENT_LABELS[lead.engagement_type] ?? lead.engagement_type) : "—"}
            {" · "}Submitted {fmt(lead.created_at)}
          </p>
        </div>

        {/* Lead status (inline header — manual override) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 uppercase tracking-wide">Status</span>
          <select
            value={status}
            onChange={(e) => {
              const v = e.target.value as LeadStatus;
              setStatus(v);
              saveField({ status: v });
            }}
            className="bg-[#0e0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/60"
            title="Status override — use contextual actions below to advance status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-[#0e0f14] text-gray-200">{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Deposit activation / status */}
        {!isConverted && canActivateDeposit && (
          <button
            onClick={() => setShowConvert(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            Activate Deposit
          </button>
        )}
        {!isConverted && !canActivateDeposit && (
          <span className="text-xs text-gray-600">Deposit activation available after proposal approval.</span>
        )}
        {isConverted && project && (
          <span className={cx(
            "px-3 py-1.5 rounded-lg text-xs font-medium border",
            project.project_status === "complete" ? "bg-green-500/10 text-green-400 border-green-500/20" :
            project.project_status === "in_build" || project.project_status === "revisions" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
            project.project_status === "client_review" || project.project_status === "final_approval" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
            "bg-green-500/10 text-green-400 border-green-500/20"
          )}>
            {(project.project_status ?? "deposit_paid").replace(/_/g, " ")}
          </span>
        )}
        {isConverted && !project && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Converted — no project
          </span>
        )}
      </header>

      {/* Next Action panel */}
      <div className="border-b border-white/5 px-6 py-3 flex items-center gap-3">
        <span className="text-[10px] text-gray-600 uppercase tracking-wide shrink-0">Next action</span>
        <span className="text-xs text-gray-300">{NEXT_ACTION[status]}</span>
        {meetingHint && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-medium">{meetingHint}</span>
        )}
        {/* Quick actions */}
        {status === "proposal_sent" && (
          <button
            type="button"
            onClick={() => { saveField({ status: "client_approved" }); setStatus("client_approved"); }}
            disabled={saving}
            className="ml-auto px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
          >
            {saving ? "Updating…" : "Mark Approved"}
          </button>
        )}
        {status === "client_approved" && (
          <button
            type="button"
            onClick={() => { saveField({ status: "deposit_requested" }); setStatus("deposit_requested"); }}
            disabled={saving}
            className="ml-auto px-4 py-1.5 rounded-lg text-xs font-medium bg-amber-600/80 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
          >
            {saving ? "Updating…" : "Request Deposit"}
          </button>
        )}
        {status === "deposit_requested" && (
          <button
            type="button"
            onClick={() => setShowConvert(true)}
            className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            Activate Deposit
          </button>
        )}
        {status === "ready_for_proposal" && (
          <button
            type="button"
            onClick={() => {
              document.getElementById("proposal-engine")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Go to Proposal
          </button>
        )}
      </div>

      {/* Lifecycle stepper */}
      <div className="px-6 pt-5 pb-2 max-w-4xl mx-auto">
        <LifecycleStepper
          currentStep={project ? (STATUS_STEP[project.project_status ?? ''] ?? 1) : 1}
          onStepClick={(step) => {
            if (!project) return;
            const currentStep = STATUS_STEP[project.project_status ?? ''] ?? 1;
            if (step < currentStep) {
              const fromLabel = LIFECYCLE_STAGES[currentStep - 1];
              const toLabel   = LIFECYCLE_STAGES[step - 1];
              if (!window.confirm(`Move status back from "${fromLabel}" to "${toLabel}"?`)) return;
            }
            updateProjectStatus(project.id, STEP_STATUS[step]);
          }}
          disabled={saving}
        />
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto grid grid-cols-1 gap-5">

        {/* ════════════════════════════════════════════════════════════════
            LEAD CONTEXT SUMMARY — consolidated lead identity + signals
            ════════════════════════════════════════════════════════════════ */}
        <div>
          <Section title="Lead Context">
            <div className="space-y-4">

              {/* ── Identity row ─────────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Contact</p>
                  <p className="text-xs text-gray-300">{lead.contact_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Company</p>
                  <p className="text-xs text-gray-300">{lead.company_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="text-xs"><a href={`mailto:${lead.contact_email}`} className="text-indigo-400 hover:text-indigo-300">{lead.contact_email ?? "—"}</a></p>
                </div>
                {lead.company_website && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Website</p>
                    <p className="text-xs"><a href={lead.company_website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">{lead.company_website}</a></p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Role</p>
                  <p className="text-xs text-gray-300">{lead.role ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Authority</p>
                  <p className="text-xs text-gray-300">{AUTHORITY_LABELS[lead.decision_authority ?? ""] ?? lead.decision_authority ?? "—"}</p>
                </div>
              </div>

              {/* ── Engagement / request context ─────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Engagement</p>
                  <p className="text-xs text-gray-300">{ENGAGEMENT_LABELS[lead.engagement_type ?? ""] ?? lead.engagement_type ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Budget</p>
                  <p className="text-xs text-gray-300">{BUDGET_LABELS[lead.budget ?? ""] ?? lead.budget ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Timeline</p>
                  <p className="text-xs text-gray-300">{TIMELINE_LABELS[lead.timeline ?? ""] ?? lead.timeline ?? "—"}</p>
                </div>
                {lead.lead_details?.current_tools && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Current tools</p>
                    <p className="text-xs text-gray-300">{lead.lead_details.current_tools}</p>
                  </div>
                )}
              </div>

              {/* ── Clarifier / intake metadata ─────────────────────────── */}
              {lead.lead_details?.clarifier_answers && Object.keys(lead.lead_details.clarifier_answers).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 pt-3 border-t border-white/5">
                  {Object.entries(lead.lead_details.clarifier_answers).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{k.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-300">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Decision signals ─────────────────────────────────────── */}
              {decisionSignals && (
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Decision signals</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-500">Input quality</span>
                      <SignalPill value={decisionSignals.inputQuality} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-500">Budget clarity</span>
                      <SignalPill value={decisionSignals.budgetClarity} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-500">Scope maturity</span>
                      <SignalPill value={decisionSignals.scopeMaturity} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-500">Commercial fit</span>
                      <SignalPill value={decisionSignals.commercialFit} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-gray-500">Next best action:</span>
                    <span className="text-xs font-medium text-indigo-400">{decisionSignals.nextBestAction}</span>
                  </div>
                </div>
              )}

            </div>
          </Section>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            MEETINGS — standalone section for post-first-stage.
            In first-stage, meeting access is via Add Information.
            ════════════════════════════════════════════════════════════════ */}
        {!["enquiry_received", "scope_analysis"].includes(status) && (
        <div>
          <Section title="Meetings">
            <div className="space-y-3">
              {/* Meeting list */}
              {meetingsLoading && <p className="text-xs text-gray-500 italic">Loading meetings…</p>}
              {!meetingsLoading && meetings.length === 0 && (
                <p className="text-xs text-gray-500 italic">No meetings scheduled yet.</p>
              )}
              {meetings.map((m) => (
                <div key={m.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-200">{MEETING_TYPE_LABELS[m.type]}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{m.stage.replace(/_/g, " ")}</span>
                      {m.completed_at && m.outcome && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{MEETING_OUTCOME_LABELS[m.outcome]}</span>
                      )}
                      {!m.completed_at && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Scheduled</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(m.scheduled_at).toLocaleString("en-IE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {m.notes && <p className="text-xs text-gray-400 mt-1">{m.notes}</p>}
                  </div>
                  {/* Complete meeting */}
                  {!m.completed_at && mtgCompleteId !== m.id && (
                    <button
                      onClick={() => { setMtgCompleteId(m.id); setMtgOutcome(""); }}
                      className="shrink-0 px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors"
                    >
                      Complete
                    </button>
                  )}
                  {mtgCompleteId === m.id && (
                    <div className="shrink-0 flex items-center gap-2">
                      <select
                        value={mtgOutcome}
                        onChange={(e) => setMtgOutcome(e.target.value as MeetingOutcome)}
                        className="bg-[#0e0f14] border border-white/10 rounded px-2 py-1 text-[11px] text-gray-200"
                      >
                        <option value="">Outcome…</option>
                        {MEETING_OUTCOMES.map((o) => (
                          <option key={o} value={o}>{MEETING_OUTCOME_LABELS[o]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => completeMeeting(m.id)}
                        disabled={!mtgOutcome || mtgSaving}
                        className="px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                      >
                        {mtgSaving ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => setMtgCompleteId(null)}
                        className="px-2 py-1 rounded text-[11px] text-gray-500 hover:text-gray-300"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Schedule meeting form */}
              {!meetingFormOpen && (
                <button
                  onClick={() => {
                    setMtgStage(STATUS_TO_MEETING_STAGE[status] ?? "scope_analysis");
                    setMeetingFormOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors"
                >
                  Schedule Meeting
                </button>
              )}
              {meetingFormOpen && (
                <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Type</label>
                      <select
                        value={mtgType}
                        onChange={(e) => setMtgType(e.target.value as MeetingType)}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200"
                      >
                        {MEETING_TYPES.map((t) => (
                          <option key={t} value={t}>{MEETING_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Stage</label>
                      <select
                        value={mtgStage}
                        onChange={(e) => setMtgStage(e.target.value as MeetingStage)}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200"
                      >
                        {MEETING_STAGES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Date / Time</label>
                    <input
                      type="datetime-local"
                      value={mtgDate}
                      onChange={(e) => setMtgDate(e.target.value)}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
                    <textarea
                      value={mtgNotes}
                      onChange={(e) => setMtgNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200 resize-none"
                      placeholder="Meeting agenda or notes…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={scheduleMeeting}
                      disabled={!mtgDate || mtgSaving}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                    >
                      {mtgSaving ? "Saving…" : "Schedule"}
                    </button>
                    <button
                      onClick={() => setMeetingFormOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CLIENT REQUEST — original intake description (full-width)
            ════════════════════════════════════════════════════════════════ */}
        <div>
          <Section title="Client request">
            {lead.lead_details?.success_definition ? (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{lead.lead_details.success_definition}</p>
            ) : (
              <p className="text-sm text-gray-600 italic">No client request submitted.</p>
            )}
          </Section>
        </div>

        {/* ── Workflow progress indicator ────────────────────────────────── */}
        {lead && (
          <div>
            <div className="px-5 py-3 rounded-xl border border-white/[0.06] bg-[#12131a]">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mr-2">Workflow</span>
                {(() => {
                  // Atomic analysis gate: show "Full Analysis" as a single step
                  // rather than individual fragments. Only show sub-steps once
                  // analysis has been explicitly run.
                  const scopeReadyDone = scopeReady !== null;
                  const proposalDone = briefProposal.trim().length > 0;

                  const isEvidenceReady = analysisPassComplete || (scopeReadyDone && scopeReady === true);
                  const steps = [
                    { label: "Gather info", done: analysisPassComplete || iterations.length > 0 },
                    { label: "Ready", done: isEvidenceReady },
                    { label: "Proposal", done: proposalDone },
                  ];

                  return steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-gray-700 text-[10px]">→</span>}
                      <span className={cx(
                        "text-[10px] font-medium px-2 py-0.5 rounded",
                        s.done
                          ? "bg-green-500/15 text-green-400"
                          : "bg-white/5 text-gray-600",
                      )}>
                        {s.done ? "✓" : "•"} {s.label}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Proposal Readiness checklist removed in v1.92.1 — operator-confusing */}

        {/* ════════════════════════════════════════════════════════════════
            ANALYSIS ACTION — single-button pipeline trigger (atomic gate)
            Pre-analysis: prominent CTA as the only entry point.
            Post-analysis: compact refresh button.
            ════════════════════════════════════════════════════════════════ */}
        {briefAccessible && (
          <div>
            <div className={cx(
              "px-5 rounded-xl border",
              analysisPassComplete
                ? "py-4 border-white/[0.06] bg-[#12131a]"
                : "py-6 border-emerald-500/20 bg-emerald-500/[0.03]",
            )}>
              {!analysisPassComplete && !unifiedRunning && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-200 mb-1">Enquiry Received</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This lead is in the enquiry stage. Run a full analysis to generate system analysis, technical research, complexity scoring, build pricing, and monthly operating costs in a single atomic pass.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-300 mb-0.5">
                    {analysisPassComplete ? "Analysis complete" : unifiedRunning ? "Analysis running…" : "Ready to analyse"}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Runs system analysis, technical research, complexity, pricing, and monthly costs in one pass.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={(!mergedClientContext.trim()) || unifiedRunning || autofillLoading || researchLoading}
                  onClick={() => runUnifiedAnalysis()}
                  className={cx(
                    "rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    analysisPassComplete
                      ? "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500"
                      : "px-7 py-3 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20",
                  )}
                >
                  {unifiedRunning ? "Running full pipeline…" : analysisPassComplete ? "Refresh analysis" : "Run Full Analysis"}
                </button>
              </div>
              {unifiedRunning && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/60 rounded-full animate-pulse" style={{ width: researchLoading ? "25%" : complexityLoading ? "50%" : autofillLoading ? "75%" : "100%" }} />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {researchLoading ? "Technical research…" : complexityLoading ? "Complexity scoring…" : autofillLoading ? "System analysis…" : "Computing pricing…"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ════════════════════════════════════════════════════════════════
            SYSTEM ANALYSIS — merged context analysis + structured brief
            Gated behind atomic analysis pass — never shown in isolation.
            ════════════════════════════════════════════════════════════════ */}
        {briefAccessible && analysisPassComplete && (
          <div>
            <Section title="System Analysis">
              <p className="text-xs text-gray-600 -mt-1 mb-3">
                Merged view of all client inputs and analysis. Driven by enquiry data, iterations, and brief data.
              </p>

              {/* ── Read-only analysis summary ─────────────────────────── */}
              <div className="space-y-2">
                <Row label="Project summary" value={briefSummary.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Project type" value={briefType.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Recommended solution" value={briefSolution.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Suggested integrations" value={briefIntegrations.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Suggested pages" value={briefPages.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Suggested features" value={briefFeatures.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Timeline estimate" value={briefTimeline.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Budget positioning" value={briefBudget.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Risks & unknowns" value={briefRisks.trim() || <span className="text-gray-600 text-sm italic">Not yet assessed</span>} />
                <Row label="Follow-up questions" value={briefFollowUp.trim() || <span className="text-gray-600 text-sm italic">None identified</span>} />
              </div>

              {/* Proposal readiness */}
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">Proposal readiness</span>
                  {scopeReady === true ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-green-500/15 text-green-400">Ready</span>
                  ) : scopeReady === false ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-amber-500/15 text-amber-400">Needs work</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-gray-500/15 text-gray-500">Not assessed</span>
                  )}
                  {readinessReason && <span className="text-xs text-gray-400">{readinessReason}</span>}
                  {(scopeReady === true || overrideScopeWarning) && briefEligible && (
                    <span className="text-[10px] text-indigo-400">→ See Scope Readiness below to create proposal</span>
                  )}
                </div>
              </div>

              {/* Context sources */}
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] text-gray-600">
                  Sources: enquiry data{iterations.length > 0 ? ` · ${iterations.length} iteration${iterations.length > 1 ? "s" : ""}` : ""}{intakePath === "discovery_call" && lead?.lead_details?.internal_notes ? " · call notes" : ""}
                </span>
              </div>

              {/* ── Editable structured brief fields ──────────────────── */}
              {briefEligible && (
                <div className="mt-5 pt-4 border-t border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-3">Editable structured brief</p>
                  {briefLoading ? (
                    <p className="text-xs text-gray-600 py-2">Loading brief…</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Project summary</label>
                        <textarea
                          value={briefSummary}
                          onChange={(e) => setBriefSummary(e.target.value)}
                          placeholder="2–3 sentence overview of what the client needs…"
                          rows={3}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Project type</label>
                        <textarea
                          value={briefType}
                          onChange={(e) => setBriefType(e.target.value)}
                          placeholder="e.g. brochure site, web app, e-commerce, redesign…"
                          rows={3}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Recommended solution</label>
                        <textarea
                          value={briefSolution}
                          onChange={(e) => setBriefSolution(e.target.value)}
                          placeholder="What OTwoOne should build and how…"
                          rows={3}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Suggested pages</label>
                        <textarea
                          value={briefPages}
                          onChange={(e) => setBriefPages(e.target.value)}
                          placeholder="Homepage, About, Services, Contact…"
                          rows={3}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Suggested features</label>
                        <textarea
                          value={briefFeatures}
                          onChange={(e) => setBriefFeatures(e.target.value)}
                          placeholder="Contact form, blog, booking…"
                          rows={3}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Suggested integrations</label>
                        <textarea
                          value={briefIntegrations}
                          onChange={(e) => setBriefIntegrations(e.target.value)}
                          placeholder="Stripe, Google Analytics, CRM…"
                          rows={3}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Timeline estimate</label>
                        <textarea
                          value={briefTimeline}
                          onChange={(e) => setBriefTimeline(e.target.value)}
                          placeholder="Realistic delivery window…"
                          rows={2}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Budget positioning</label>
                        <textarea
                          value={briefBudget}
                          onChange={(e) => setBriefBudget(e.target.value)}
                          placeholder="Where this sits vs stated budget…"
                          rows={2}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Risks &amp; unknowns</label>
                        <textarea
                          value={briefRisks}
                          onChange={(e) => setBriefRisks(e.target.value)}
                          placeholder="Anything unclear, missing, or risky…"
                          rows={3}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Follow-up questions</label>
                        <textarea
                          value={briefFollowUp}
                          onChange={(e) => setBriefFollowUp(e.target.value)}
                          placeholder="Questions to ask the client before proceeding…"
                          rows={3}
                          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                        />
                      </div>

                      {/* Save bar for brief fields */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={cx("text-xs transition-opacity", briefSaved ? "text-green-400 opacity-100" : "opacity-0")}>
                            Saved
                          </span>
                          {brief && (
                            <span className="text-[10px] text-gray-700">
                              Last updated {fmtDateTime(brief.updated_at)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={saveBrief}
                          disabled={briefSaving}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                        >
                          {briefSaving ? "Saving…" : "Save brief"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TECHNICAL RESEARCH — stack due-diligence from Research Agent
            Gated behind atomic analysis pass — never shown in isolation.
            ════════════════════════════════════════════════════════════════ */}
        {briefAccessible && analysisPassComplete && (
          <div>
            <Section title="Technical Research">
              {technicalResearch ? (
                <div className="space-y-4">
                  {/* Overall summary */}
                  <p className="text-sm text-gray-300 leading-relaxed">{technicalResearch.summary}</p>

                  {/* Recommendations / Assumptions / Unknowns */}
                  <div className="space-y-3">
                    {technicalResearch.recommendations.length > 0 && (
                      <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                        <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide font-medium mb-1.5">Recommendations</p>
                        <ul className="space-y-1">
                          {technicalResearch.recommendations.map((r, i) => (
                            <li key={i} className="text-xs text-gray-400 leading-relaxed">• {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {technicalResearch.assumptions.length > 0 && (
                      <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1.5">Assumptions</p>
                        <ul className="space-y-1">
                          {technicalResearch.assumptions.map((a, i) => (
                            <li key={i} className="text-xs text-gray-500 leading-relaxed">• {a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {technicalResearch.unknowns.length > 0 && (
                      <div className="px-3 py-3 rounded-lg border border-amber-500/10 bg-amber-500/[0.02]">
                        <p className="text-[10px] text-amber-400/70 uppercase tracking-wide font-medium mb-1.5">Unknowns</p>
                        <ul className="space-y-1">
                          {technicalResearch.unknowns.map((u, i) => (
                            <li key={i} className="text-xs text-amber-400/60 leading-relaxed">• {u}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Research category cards */}
                  <div className="space-y-3">
                    {(["integrations", "infrastructure", "third_party_services", "compliance", "operating_cost_estimate"] as const).map((catKey) => {
                      const category = technicalResearch[catKey];
                      const labels: Record<string, string> = {
                        integrations: "Integrations",
                        infrastructure: "Infrastructure",
                        third_party_services: "Third-Party Services",
                        compliance: "Compliance",
                        operating_cost_estimate: "Operating Cost Estimate",
                      };
                      return (
                        <div key={catKey} className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1.5">{labels[catKey]}</p>
                          <p className="text-xs text-gray-400 mb-2 leading-relaxed">{category.summary}</p>
                          {category.items.length > 0 && (
                            <ul className="space-y-1.5">
                              {category.items.map((item, i) => (
                                <li key={i} className="text-xs">
                                  <span className="text-gray-300 font-medium">{item.name}</span>
                                  <span className={cx(
                                    "ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase",
                                    item.relevance === "required" && "bg-green-500/15 text-green-400",
                                    item.relevance === "likely" && "bg-amber-500/15 text-amber-400",
                                    item.relevance === "optional" && "bg-gray-500/15 text-gray-500",
                                  )}>{item.relevance}</span>
                                  <span className="block text-gray-500 mt-0.5">{item.description}</span>
                                  {item.pricing && <span className="block text-emerald-400/70 text-[11px] mt-0.5">{item.pricing}</span>}
                                  {item.docs_url && (
                                    <a href={item.docs_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-[10px]">[docs]</a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Last researched */}
                  {researchUpdatedAt && (
                    <p className="text-[10px] text-gray-600">Last researched {fmtDateTime(researchUpdatedAt)}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  No technical research yet. Click <span className="text-violet-400">Research stack</span> above to analyse integrations, infrastructure, compliance, and operating costs.
                </p>
              )}
            </Section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            COMPLEXITY ENGINE — 0–100 scoring from upstream workflow outputs
            Gated behind atomic analysis pass — never shown in isolation.
            ════════════════════════════════════════════════════════════════ */}
        {briefAccessible && analysisPassComplete && complexityResult && (
          <div>
            <Section title="Complexity Engine">
              <div className="space-y-4">

                {/* ── Score + class ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="px-3 py-3 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.03]">
                    <p className="text-[10px] text-cyan-400/70 uppercase tracking-wide mb-1">Complexity score</p>
                    <p className="text-xl font-bold text-cyan-300">{Math.min(complexityResult.complexity_score, 100)}<span className="text-sm text-cyan-400/60">/100</span></p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Complexity class</p>
                    <p className={cx(
                      "text-sm font-medium",
                      complexityResult.complexity_class === "brochure_site" && "text-blue-400",
                      complexityResult.complexity_class === "dynamic_website" && "text-emerald-400",
                      complexityResult.complexity_class === "web_application" && "text-amber-400",
                      complexityResult.complexity_class === "system_platform" && "text-orange-400",
                      complexityResult.complexity_class === "operational_platform" && "text-red-400",
                    )}>
                      {complexityResult.complexity_class.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Estimated effort</p>
                    <p className="text-sm font-semibold text-gray-100">{complexityResult.estimated_days_low}–{complexityResult.estimated_days_high} days</p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Signals detected</p>
                    <p className="text-sm font-medium text-gray-200">{complexityResult.detected_signals.length}</p>
                  </div>
                </div>

                {/* ── Detected signals ─────────────────────────────────── */}
                {complexityResult.detected_signals.length > 0 && (
                  <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Detected signals</p>
                    <div className="flex flex-wrap gap-2">
                      {complexityResult.detected_signals.map((s) => (
                        <span key={s.key} className="px-2 py-1 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {s.key.replace(/_/g, " ")} <span className="text-cyan-400/50">+{s.weight}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Build components ─────────────────────────────────── */}
                {complexityResult.build_components.length > 0 && (
                  <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Build components</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {complexityResult.build_components.map((c) => (
                        <div key={c.key} className="text-[11px] text-gray-400">
                          <span className="text-gray-300">{c.label}</span>
                          <span className="text-gray-600 ml-1">{c.days_low}–{c.days_high}d</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Rationale ────────────────────────────────────────── */}
                <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Complexity rationale</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{complexityResult.complexity_rationale}</p>
                </div>

                {/* ── Upstream sources ─────────────────────────────────── */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-600">Sources:</span>
                  {complexityResult.upstream_sources_used.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-500/10 text-gray-500">
                      {s.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>

              </div>
            </Section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            BUILD PRICING — deterministic price from complexity engine output
            Gated behind atomic analysis pass — never shown in isolation.
            ════════════════════════════════════════════════════════════════ */}
        {briefAccessible && analysisPassComplete && buildPricing && (
          <div>
            <Section title="Build Pricing">
              <div className="space-y-4">

                {/* ── Core pricing ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="px-3 py-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03]">
                    <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide mb-1">Recommended price</p>
                    <p className="text-xl font-bold text-emerald-300">€{(effectiveBuildPrice).toLocaleString()}</p>
                    {buildPriceOverride.trim() && !isNaN(Number(buildPriceOverride)) && (
                      <p className="text-[10px] text-emerald-400/50 mt-0.5">Override active (was €{buildPricing.recommended_build_price.toLocaleString()})</p>
                    )}
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Build days</p>
                    <p className="text-sm font-semibold text-gray-100">{buildPricing.recommended_build_days} days</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">range: {buildPricing.estimated_days_low}–{buildPricing.estimated_days_high}</p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Day rate</p>
                    <p className="text-sm font-semibold text-gray-100">€{buildPricing.day_rate}</p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Confidence range</p>
                    <p className="text-sm font-medium text-gray-200">€{buildPricing.confidence_range_low.toLocaleString()} – €{buildPricing.confidence_range_high.toLocaleString()}</p>
                  </div>
                </div>

                {/* ── Budget comparison ────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Client budget</p>
                    <p className="text-sm font-medium text-gray-200">
                      {buildPricing.client_budget_low !== null
                        ? `€${buildPricing.client_budget_low.toLocaleString()} – €${buildPricing.client_budget_high!.toLocaleString()}`
                        : "Not stated"}
                    </p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Budget gap</p>
                    <p className={cx(
                      "text-sm font-medium",
                      buildPricing.budget_gap_low !== null && buildPricing.budget_gap_low <= 0 && "text-green-400",
                      buildPricing.budget_gap_low !== null && buildPricing.budget_gap_low > 0 && buildPricing.budget_gap_low <= buildPricing.recommended_build_price * 0.3 && "text-amber-400",
                      buildPricing.budget_gap_low !== null && buildPricing.budget_gap_low > buildPricing.recommended_build_price * 0.3 && "text-red-400",
                      buildPricing.budget_gap_low === null && "text-gray-500",
                    )}>
                      {buildPricing.budget_gap_low !== null
                        ? buildPricing.budget_gap_low <= 0
                          ? "Within budget"
                          : `+€${buildPricing.budget_gap_low.toLocaleString()} over top`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Commercial strategy</p>
                    <p className={cx(
                      "text-sm font-medium",
                      buildPricing.commercial_strategy.includes("Within") && "text-green-400",
                      buildPricing.commercial_strategy.includes("Scope adjustment") && "text-amber-400",
                      buildPricing.commercial_strategy.includes("exceeds") && "text-red-400",
                      buildPricing.commercial_strategy.includes("No stated") && "text-gray-400",
                    )}>
                      {buildPricing.commercial_strategy}
                    </p>
                  </div>
                </div>

                {/* ── Operator override ────────────────────────────────── */}
                <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Override build price (optional)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">€</span>
                    <input
                      type="text"
                      value={buildPriceOverride}
                      onChange={(e) => setBuildPriceOverride(e.target.value)}
                      placeholder={String(buildPricing.recommended_build_price)}
                      className="w-40 bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
                    />
                    {buildPriceOverride.trim() && (
                      <button
                        type="button"
                        onClick={() => setBuildPriceOverride("")}
                        className="text-[10px] text-gray-500 hover:text-gray-300"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Rationale ────────────────────────────────────────── */}
                <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Pricing rationale</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{buildPricing.pricing_rationale}</p>
                </div>

              </div>
            </Section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            MONTHLY OPERATING COST — recurring infrastructure + support retainer
            Gated behind atomic analysis pass — never shown in isolation.
            ════════════════════════════════════════════════════════════════ */}
        {briefAccessible && analysisPassComplete && (
          <div>
            <Section title="Monthly Operating Cost">
              {/* runningCosts is guaranteed non-null inside analysisPassComplete gate */}
              {runningCosts && (
              <div className="space-y-4">

                {/* ── Totals ──────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="px-3 py-3 rounded-lg border border-violet-500/15 bg-violet-500/[0.03]">
                    <p className="text-[10px] text-violet-400/70 uppercase tracking-wide mb-1">Total monthly cost</p>
                    <p className="text-xl font-bold text-violet-300">
                      €{runningCosts.total_with_retainer_low.toLocaleString()}
                      {runningCosts.total_with_retainer_low !== runningCosts.total_with_retainer_high && (
                        <span className="text-sm font-normal text-violet-400"> – €{runningCosts.total_with_retainer_high.toLocaleString()}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-violet-400/50 mt-0.5">/month incl. support retainer</p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Infrastructure / tools</p>
                    <p className="text-sm font-semibold text-gray-100">
                      {runningCosts.items.length > 0
                        ? <>€{runningCosts.total_low.toLocaleString()}{runningCosts.total_low !== runningCosts.total_high && ` – €${runningCosts.total_high.toLocaleString()}`}</>
                        : <span className="text-gray-500 font-normal">€0</span>}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">/month</p>
                  </div>
                  <div className="px-3 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">OTwoOne support</p>
                    <p className="text-sm font-semibold text-gray-100">€{runningCosts.support_retainer}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">/month retainer</p>
                  </div>
                </div>

                {/* ── Line items ──────────────────────────────────────── */}
                <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Cost breakdown</p>
                  <div className="space-y-1.5">
                    {runningCosts.items.length > 0 ? (
                      runningCosts.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={cx(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              item.relevance === "required" && "bg-emerald-400",
                              item.relevance === "likely" && "bg-amber-400",
                              item.relevance === "optional" && "bg-gray-500",
                            )} />
                            <span className="text-gray-300 truncate">{item.name}</span>
                          </div>
                          <span className="text-gray-400 ml-2 flex-shrink-0">
                            €{item.low.toLocaleString()}{item.low !== item.high && ` – €${item.high.toLocaleString()}`}/mo
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 italic">No recurring infrastructure or third-party costs identified.</p>
                    )}
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                        <span className="text-violet-300 font-medium">OTwoOne support retainer</span>
                      </div>
                      <span className="text-violet-300 font-medium ml-2 flex-shrink-0">€{runningCosts.support_retainer}/mo</span>
                    </div>
                  </div>
                </div>

                {/* ── Rationale ───────────────────────────────────────── */}
                <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Operating cost rationale</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{runningCosts.rationale}</p>
                </div>

              </div>
              )}
            </Section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            ADD INFORMATION — add iteration entry and recompute pipeline
            ════════════════════════════════════════════════════════════════ */}
        {briefAccessible && (
          <div>
            <Section title="Add Information">
              <div className="space-y-3">
                <p className="text-xs text-gray-500 -mt-1">
                  Capture context from calls, emails, meetings, or other sources. The analysis pipeline updates automatically.
                </p>

                {/* Helper actions — communication + meeting scheduling */}
                {["enquiry_received", "scope_analysis"].includes(status) && (
                  <div className="space-y-2 pb-3 border-b border-white/5">
                    <div className="flex flex-wrap gap-2">
                      {lead?.contact_email && (
                        <a
                          href={`mailto:${lead.contact_email}?subject=${encodeURIComponent("Following up — " + (lead.company_name ?? lead.contact_name ?? "your enquiry"))}`}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300 transition-all inline-flex items-center gap-1"
                        >
                          Send email
                        </a>
                      )}
                      <a
                        href={bookingsUrl ?? `https://outlook.office.com/calendar/action/compose?subject=${encodeURIComponent("Call — " + (lead?.company_name ?? lead?.contact_name ?? "Client"))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300 transition-all inline-flex items-center gap-1"
                      >
                        Schedule call
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setMtgStage(STATUS_TO_MEETING_STAGE[status] ?? "scope_analysis");
                          setMeetingFormOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300 transition-all"
                      >
                        Schedule meeting
                      </button>
                    </div>

                    {/* Inline meeting scheduling form */}
                    {meetingFormOpen && (
                      <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02] space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Type</label>
                            <select value={mtgType} onChange={(e) => setMtgType(e.target.value as MeetingType)} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200">
                              {MEETING_TYPES.map((t) => (<option key={t} value={t}>{MEETING_TYPE_LABELS[t]}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Date / Time</label>
                            <input type="datetime-local" value={mtgDate} onChange={(e) => setMtgDate(e.target.value)} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
                          <textarea value={mtgNotes} onChange={(e) => setMtgNotes(e.target.value)} rows={2} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200 resize-none" placeholder="Meeting agenda or notes…" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={scheduleMeeting} disabled={!mtgDate || mtgSaving} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50">{mtgSaving ? "Saving…" : "Schedule"}</button>
                          <button onClick={() => setMeetingFormOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Recent/scheduled meetings — lightweight inline context */}
                    {meetings.length > 0 && (
                      <div className="space-y-1">
                        {meetings.slice(0, 3).map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-[11px]">
                            <span className={cx("px-1.5 py-0.5 rounded", m.completed_at ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                              {m.completed_at ? "Done" : "Scheduled"}
                            </span>
                            <span className="text-gray-400">{MEETING_TYPE_LABELS[m.type]}</span>
                            <span className="text-gray-600">{new Date(m.scheduled_at).toLocaleDateString("en-IE", { day: "numeric", month: "short" })}</span>
                            {!m.completed_at && mtgCompleteId !== m.id && (
                              <button onClick={() => { setMtgCompleteId(m.id); setMtgOutcome(""); }} className="text-emerald-400 hover:text-emerald-300 ml-auto">Mark done</button>
                            )}
                            {mtgCompleteId === m.id && (
                              <div className="flex items-center gap-1 ml-auto">
                                <select value={mtgOutcome} onChange={(e) => setMtgOutcome(e.target.value as MeetingOutcome)} className="bg-[#0e0f14] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-gray-200">
                                  <option value="">Outcome…</option>
                                  {MEETING_OUTCOMES.map((o) => (<option key={o} value={o}>{MEETING_OUTCOME_LABELS[o]}</option>))}
                                </select>
                                <button onClick={() => completeMeeting(m.id)} disabled={!mtgOutcome || mtgSaving} className="text-emerald-400 disabled:opacity-50">{mtgSaving ? "…" : "Save"}</button>
                                <button onClick={() => setMtgCompleteId(null)} className="text-gray-600">×</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Iteration summary card */}
                {iterations.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-white/5">
                    <div className="px-3 py-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.03]">
                      <p className="text-[10px] text-amber-400/70 uppercase tracking-wide">Total inputs</p>
                      <p className="text-lg font-bold text-amber-300">{iterations.length}</p>
                    </div>
                    <div className="px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02]">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Latest source</p>
                      <p className="text-sm font-medium text-gray-300">{iterations[iterations.length - 1].source_type.replace(/_/g, " ")}</p>
                    </div>
                    <div className="px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02]">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">First added</p>
                      <p className="text-sm font-medium text-gray-300">{new Date(iterations[0].created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02]">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Last added</p>
                      <p className="text-sm font-medium text-gray-300">{new Date(iterations[iterations.length - 1].created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Source type</label>
                    <select
                      value={iterSourceType}
                      onChange={(e) => setIterSourceType(e.target.value as typeof iterSourceType)}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500/40"
                    >
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="document">Document</option>
                      <option value="client_reply">Client reply</option>
                      <option value="internal_note">Internal note</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Source date</label>
                    <input
                      type="date"
                      value={iterSourceDate}
                      onChange={(e) => setIterSourceDate(e.target.value)}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
                  <textarea
                    value={iterNotes}
                    onChange={(e) => setIterNotes(e.target.value)}
                    placeholder="e.g. Client confirmed they need document upload for customer invoices. Budget increased to €10k–€15k."
                    rows={3}
                    className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40 resize-none leading-relaxed"
                  />
                </div>
                <button
                  type="button"
                  disabled={iterNotes.trim().length < 5 || iterSaving || unifiedRunning}
                  onClick={analysisPassComplete ? addIterationAndRefresh : addIteration}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600/80 hover:bg-amber-600 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {iterSaving
                    ? (analysisPassComplete ? "Saving & recomputing…" : "Saving…")
                    : (analysisPassComplete ? "Add and refresh analysis" : "Add context")}
                </button>
              </div>
            </Section>
          </div>
        )}
        {/* ════════════════════════════════════════════════════════════════
            ITERATION LOG — chronological record of new information added
            ════════════════════════════════════════════════════════════════ */}
        {briefAccessible && iterations.length > 0 && (
          <div>
            <Section title="Iteration history">
              <div className="space-y-2">
                {iterations.map((it, idx) => {
                  const isOpen = expandedIteration === it.id;
                  const preview = it.notes.length > 120 ? it.notes.slice(0, 120) + "…" : it.notes;
                  return (
                    <div key={it.id} className="rounded-lg bg-white/[0.02] border border-white/5 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedIteration(isOpen ? null : it.id)}
                        className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="w-6 h-6 flex items-center justify-center rounded bg-amber-500/10 text-[10px] font-bold text-amber-400 shrink-0">#{idx + 1}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400">{it.source_type.replace(/_/g, " ")}</span>
                        {it.source_date && <span className="text-[10px] text-gray-500">{it.source_date}</span>}
                        <span className="text-[10px] text-gray-600 ml-auto shrink-0">{fmtDateTime(it.created_at)}</span>
                        <span className="text-xs text-gray-600 shrink-0">{isOpen ? "▲" : "▼"}</span>
                      </button>
                      {isOpen ? (
                        <div className="px-4 pb-3 border-t border-white/5 pt-2">
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{it.notes}</p>
                        </div>
                      ) : (
                        <div className="px-4 pb-3">
                          <p className="text-xs text-gray-500 leading-relaxed truncate">{preview}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        )}

        {/* ── Readiness — evidence-driven 2-state, no internal gates ────── */}
        {briefAccessible && (
          <Section title="Readiness">
            <div className="space-y-4">

              {/* ── First-stage readiness: exactly 2 states, evidence-driven ── */}
              {["enquiry_received", "scope_analysis"].includes(status) && (() => {
                // ── Evidence collection ──
                const hasAnalysis = analysisPassComplete;
                const hasIterations = iterations.length > 0;
                const hasMeetingsDone = meetings.filter(m => m.completed_at).length > 0;
                const enquiryQuality = (lead.total_score ?? 0) >= 3.5;
                const hasBudget = Boolean(lead.budget && lead.budget !== "not_sure");
                const hasSuccessDef = Boolean(lead.lead_details?.success_definition?.trim());

                // ── Evidence-driven readiness: exactly 2 states ──
                // READY when: (analysis done) OR (strong enquiry + follow-up evidence)
                // MORE_INFO when: gaps remain that make proposal premature
                const isReady =
                  scopeReady === true ||                                              // explicit scope check passed
                  (hasAnalysis && scopeReady !== false) ||                            // analysis complete, not explicitly flagged as unready
                  (enquiryQuality && hasSuccessDef && hasBudget && (hasIterations || hasMeetingsDone)); // strong enquiry + evidence

                let reason: string;
                if (isReady) {
                  if (scopeReady === true) {
                    reason = "Scope confirmed — enough detail to prepare a proposal.";
                  } else if (hasAnalysis && hasIterations) {
                    reason = `Analysis complete with ${iterations.length} additional input${iterations.length !== 1 ? "s" : ""}. Enough context to prepare a proposal.`;
                  } else if (hasAnalysis) {
                    reason = "Analysis complete. Enough information from the enquiry to prepare a proposal.";
                  } else {
                    reason = "Strong enquiry with follow-up information gathered. Ready to prepare a proposal.";
                  }
                } else {
                  if (scopeReady === false) {
                    reason = readinessReason || "Key details are still needed before a proposal can be prepared.";
                  } else if (!hasSuccessDef) {
                    reason = "No clear project description from the client yet. Capture requirements via Add Information above.";
                  } else if (!hasBudget) {
                    reason = "Budget not confirmed. Gather budget clarity before preparing a proposal.";
                  } else if (!hasIterations && !hasMeetingsDone) {
                    reason = "Only the original enquiry available. Add context from a call, email, or meeting to strengthen the scope.";
                  } else {
                    reason = "Some context gathered but not enough to confidently prepare a proposal. Continue gathering information.";
                  }
                }

                return (
                  <div className="space-y-3">
                    {/* Readiness badge */}
                    <div className={cx(
                      "px-4 py-3 rounded-lg border",
                      isReady ? "bg-green-500/5 border-green-500/20" : "bg-amber-500/5 border-amber-500/20",
                    )}>
                      <p className={cx("text-sm font-medium mb-1", isReady ? "text-green-400" : "text-amber-400")}>
                        {isReady ? "Ready for proposal" : "More information needed"}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">{reason}</p>
                    </div>

                    {/* Progression CTA when ready */}
                    {isReady && (() => {
                      const proposalApproved = proposal && ["approved", "signed", "deposit_requested", "deposit_received"].includes(proposal.status);
                      const proposalExists = !!proposal;
                      const needsStatusAdvance = status === "enquiry_received" || status === "scope_analysis";
                      return (
                        <div className="space-y-2">
                          {/* Primary CTA: advance status if needed, then create proposal */}
                          {!proposalApproved && needsStatusAdvance && (
                            <button
                              type="button"
                              onClick={() => { saveField({ status: "ready_for_proposal" }); setStatus("ready_for_proposal"); }}
                              disabled={saving}
                              className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
                            >
                              {saving ? "Updating…" : "Move to Ready for Proposal"}
                            </button>
                          )}
                          {!proposalApproved && !needsStatusAdvance && (
                            <p className="text-xs text-gray-500">Scroll down to the Proposal Workspace to continue.</p>
                          )}
                          {proposalApproved && (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Proposal Approved</span>
                              {proposal?.view_token && (
                                <a href={`/proposal/${proposal.view_token}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">View ↗</a>
                              )}
                            </div>
                          )}
                          {proposalError && <p className="text-xs text-red-400">{proposalError}</p>}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* ── ready_for_proposal status — show missing inputs if scope not ready ── */}
              {status === "ready_for_proposal" && scopeReady !== true && !overrideScopeWarning && (() => {
                const missingInputs: string[] = [];
                if (!briefSummary.trim()) missingInputs.push("System analysis");
                if (!technicalResearch) missingInputs.push("Technical research");
                if (!complexityResult) missingInputs.push("Complexity scoring");
                if (!buildPricing) missingInputs.push("Build pricing");
                if (!runningCosts) missingInputs.push("Running costs");
                if (scopeReady === null) missingInputs.push("Scope readiness check");
                if (scopeReady === false) missingInputs.push("Scope not ready (override available)");

                return missingInputs.length > 0 ? (
                  <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <p className="text-[10px] text-amber-400 font-medium mb-1">Before proposal — complete these inputs:</p>
                    <ul className="text-[10px] text-amber-400/70 space-y-0.5">
                      {missingInputs.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
                  </div>
                ) : null;
              })()}

              {/* ── ready_for_proposal with readiness → lightweight hint ── */}
              {status === "ready_for_proposal" && briefEligible && (scopeReady === true || overrideScopeWarning) && (
                <p className="text-xs text-gray-500">Proposal Workspace is ready below.</p>
              )}

              {/* ── Post-proposal status — show status + link back ── */}
              {["proposal_sent", "client_approved", "deposit_requested", "in_build", "client_review", "revisions", "final_approval", "full_payment_requested", "complete"].includes(status) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border",
                    status === "proposal_sent" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                    status === "complete" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                    "bg-violet-500/10 text-violet-400 border-violet-500/20"
                  )}>
                    {STATUS_LABELS[status]}
                  </span>
                  {proposal?.view_token && (
                    <a href={`/proposal/${proposal.view_token}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">View proposal ↗</a>
                  )}
                </div>
              )}

            </div>
          </Section>
        )}

        {/* ════════════════════════════════════════════════════════════════
            REVISION EXECUTION — structured revision batches from feedback
            Only shown from in_build onward — not relevant during scoping.
            ════════════════════════════════════════════════════════════════ */}
        {["in_build", "client_review", "revisions", "final_approval", "full_payment_requested", "complete"].includes(status) && (
        <>
        <Section title="Revision Execution">
          {/* Feedback input */}
          <div className="mb-4">
            <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Client Feedback</label>
            <textarea
              value={leadRevFeedback}
              onChange={(e) => setLeadRevFeedback(e.target.value)}
              placeholder="Paste client feedback from email, call notes, or meeting notes…"
              rows={4}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className={cx("text-xs transition-opacity", leadRevError ? "text-red-400 opacity-100" : "opacity-0")}>
                {leadRevError || "—"}
              </span>
              <button
                type="button"
                onClick={generateRevisionPlan}
                disabled={leadRevGenerating || leadRevFeedback.trim().length < 10}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {leadRevGenerating ? "Generating…" : "Generate Revision Plan"}
              </button>
            </div>
          </div>

          {/* Revision batches */}
          {leadRevisions.length > 0 && (
            <div className="space-y-4 mt-4 pt-4 border-t border-white/5">
              {leadRevisions.map((rev) => (
                <div key={rev.id} className="space-y-3">
                  <p className="text-[10px] text-gray-600">
                    Generated {new Date(rev.created_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}, {new Date(rev.created_at).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {rev.structured_output.batches.map((batch, bi) => {
                    const batchStatus = batch.status ?? "pending";
                    const batchEffort = batch.effort ?? "medium";
                    return (
                    <div key={bi} className={cx(
                      "rounded-lg border bg-[#0e0f14] p-4",
                      batchStatus === "complete" ? "border-green-500/20" : "border-white/[0.06]"
                    )}>
                      {/* Batch header: title + badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={cx("text-sm font-medium", batchStatus === "complete" ? "text-gray-500 line-through" : "text-gray-200")}>{batch.title}</span>
                        {/* Priority selector */}
                        <select
                          value={batch.priority}
                          onChange={(e) => updateBatchTriage(rev.id, bi, { priority: e.target.value })}
                          className={cx(
                            "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border-0 cursor-pointer appearance-none",
                            batch.priority === "high" ? "bg-red-500/15 text-red-400" :
                            batch.priority === "medium" ? "bg-amber-500/15 text-amber-400" :
                            "bg-gray-500/15 text-gray-400"
                          )}
                        >
                          <option value="high">high</option>
                          <option value="medium">medium</option>
                          <option value="low">low</option>
                        </select>
                        {/* Effort selector */}
                        <select
                          value={batchEffort}
                          onChange={(e) => updateBatchTriage(rev.id, bi, { effort: e.target.value })}
                          className={cx(
                            "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border-0 cursor-pointer appearance-none",
                            batchEffort === "large" ? "bg-orange-500/15 text-orange-400" :
                            batchEffort === "small" ? "bg-teal-500/15 text-teal-400" :
                            "bg-violet-500/15 text-violet-400"
                          )}
                        >
                          <option value="small">small</option>
                          <option value="medium">medium</option>
                          <option value="large">large</option>
                        </select>
                        {/* Status selector */}
                        <select
                          value={batchStatus}
                          onChange={(e) => updateBatchTriage(rev.id, bi, { status: e.target.value })}
                          className={cx(
                            "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border-0 cursor-pointer appearance-none",
                            batchStatus === "complete" ? "bg-green-500/15 text-green-400" :
                            batchStatus === "in_progress" ? "bg-amber-500/15 text-amber-400" :
                            batchStatus === "ready" ? "bg-blue-500/15 text-blue-400" :
                            "bg-gray-500/15 text-gray-500"
                          )}
                        >
                          <option value="pending">pending</option>
                          <option value="ready">ready</option>
                          <option value="in_progress">in progress</option>
                          <option value="complete">complete</option>
                        </select>
                      </div>
                      {/* Mark as Complete — shown when latest run is QA-passed and batch isn't complete */}
                      {(() => {
                        if (batchStatus === "complete") return null;
                        const runs = executionRuns.filter(r => r.revision_id === rev.id && r.batch_index === bi);
                        if (runs.length === 0) return null;
                        const latest = runs[0]; // already sorted newest-first
                        if (latest.qa_status !== "passed") return null;
                        return (
                          <button
                            onClick={() => updateBatchTriage(rev.id, bi, { status: "complete" })}
                            className="mt-2 px-3 py-1 rounded text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/20 transition-colors"
                          >
                            ✓ Mark as Complete
                          </button>
                        );
                      })()}
                      {/* Items */}
                      <ul className="space-y-1.5">
                        {batch.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2 text-xs text-gray-400">
                            <span className={cx(
                              "mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide shrink-0",
                              item.type === "functionality" ? "bg-blue-500/15 text-blue-400" :
                              item.type === "design" ? "bg-purple-500/15 text-purple-400" :
                              item.type === "content" ? "bg-green-500/15 text-green-400" :
                              item.type === "integration" ? "bg-cyan-500/15 text-cyan-400" :
                              "bg-gray-500/15 text-gray-500"
                            )}>
                              {item.type}
                            </span>
                            <span>{item.description}</span>
                          </li>
                        ))}
                      </ul>
                      {/* Operator note — saves on blur to avoid excessive API calls */}
                      <div className="mt-3 pt-2 border-t border-white/5">
                        <input
                          type="text"
                          defaultValue={batch.operator_note ?? ""}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== (batch.operator_note ?? "")) {
                              updateBatchTriage(rev.id, bi, { operator_note: val });
                            }
                          }}
                          placeholder="Operator note…"
                          className="w-full bg-transparent text-xs text-gray-400 placeholder:text-gray-700 focus:outline-none focus:text-gray-300"
                        />
                      </div>
                      {/* Execution Brief — expandable per batch */}
                      {(() => {
                        const briefKey = `${rev.id}-${bi}`;
                        const isExpanded = expandedBriefs.has(briefKey);
                        const hasContent = !!(batch.objective || batch.implementation_notes || (batch.open_questions?.length) || (batch.acceptance_criteria?.length));
                        return (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setExpandedBriefs(prev => {
                                  const next = new Set(prev);
                                  if (next.has(briefKey)) next.delete(briefKey); else next.add(briefKey);
                                  return next;
                                })}
                                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300 transition-colors"
                              >
                                <span className="text-[8px]">{isExpanded ? "▼" : "▶"}</span>
                                Execution Brief
                                {hasContent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60" />}
                              </button>
                              <button
                                onClick={() => generateExecutionTask(rev.id, bi)}
                                disabled={taskGenerating}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                              >
                                {taskGenerating ? "Generating…" : "⚡ Generate Task"}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="mt-3 space-y-3">
                                {/* Objective */}
                                <div>
                                  <label className="block text-[10px] uppercase tracking-wide text-gray-600 mb-1">Objective</label>
                                  <textarea
                                    defaultValue={batch.objective ?? ""}
                                    onBlur={(e) => {
                                      const val = e.target.value;
                                      if (val !== (batch.objective ?? "")) updateBatchTriage(rev.id, bi, { objective: val });
                                    }}
                                    rows={2}
                                    placeholder="What is the intended outcome?"
                                    className="w-full bg-white/[0.03] rounded px-2 py-1.5 text-xs text-gray-300 placeholder:text-gray-700 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
                                  />
                                </div>
                                {/* Implementation Notes */}
                                <div>
                                  <label className="block text-[10px] uppercase tracking-wide text-gray-600 mb-1">Implementation Notes</label>
                                  <textarea
                                    defaultValue={batch.implementation_notes ?? ""}
                                    onBlur={(e) => {
                                      const val = e.target.value;
                                      if (val !== (batch.implementation_notes ?? "")) updateBatchTriage(rev.id, bi, { implementation_notes: val });
                                    }}
                                    rows={3}
                                    placeholder="Practical notes for the implementer…"
                                    className="w-full bg-white/[0.03] rounded px-2 py-1.5 text-xs text-gray-300 placeholder:text-gray-700 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
                                  />
                                </div>
                                {/* Open Questions — one per line */}
                                <div>
                                  <label className="block text-[10px] uppercase tracking-wide text-gray-600 mb-1">Open Questions <span className="normal-case text-gray-700">(one per line)</span></label>
                                  <textarea
                                    defaultValue={(batch.open_questions ?? []).join("\n")}
                                    onBlur={(e) => {
                                      const lines = e.target.value.split("\n").map(l => l.trim()).filter(Boolean);
                                      const prev = batch.open_questions ?? [];
                                      if (JSON.stringify(lines) !== JSON.stringify(prev)) updateBatchTriage(rev.id, bi, { open_questions: lines });
                                    }}
                                    rows={2}
                                    placeholder="Questions that need answering before work starts…"
                                    className="w-full bg-white/[0.03] rounded px-2 py-1.5 text-xs text-gray-300 placeholder:text-gray-700 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
                                  />
                                </div>
                                {/* Acceptance Criteria — one per line */}
                                <div>
                                  <label className="block text-[10px] uppercase tracking-wide text-gray-600 mb-1">Acceptance Criteria <span className="normal-case text-gray-700">(one per line)</span></label>
                                  <textarea
                                    defaultValue={(batch.acceptance_criteria ?? []).join("\n")}
                                    onBlur={(e) => {
                                      const lines = e.target.value.split("\n").map(l => l.trim()).filter(Boolean);
                                      const prev = batch.acceptance_criteria ?? [];
                                      if (JSON.stringify(lines) !== JSON.stringify(prev)) updateBatchTriage(rev.id, bi, { acceptance_criteria: lines });
                                    }}
                                    rows={2}
                                    placeholder="Observable checks that confirm this batch is done…"
                                    className="w-full bg-white/[0.03] rounded px-2 py-1.5 text-xs text-gray-300 placeholder:text-gray-700 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {/* Execution Runs — per batch */}
                      {(() => {
                        const runKey = `${rev.id}-${bi}`;
                        const batchRuns = executionRuns.filter(r => r.revision_id === rev.id && r.batch_index === bi);
                        const isRunsExpanded = expandedRunSections.has(runKey);
                        return (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <button
                              onClick={() => setExpandedRunSections(prev => {
                                const next = new Set(prev);
                                if (next.has(runKey)) next.delete(runKey); else next.add(runKey);
                                return next;
                              })}
                              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              <span className="text-[8px]">{isRunsExpanded ? "▼" : "▶"}</span>
                              Execution Runs
                              {batchRuns.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-medium">{batchRuns.length}</span>
                              )}
                            </button>
                            {isRunsExpanded && (
                              <div className="mt-2 space-y-3">
                                {/* Add run form */}
                                <div className="space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                  <textarea
                                    value={runReportInputs[runKey] ?? ""}
                                    onChange={(e) => setRunReportInputs(prev => ({ ...prev, [runKey]: e.target.value }))}
                                    placeholder="Paste Claude OUTPUT REPORT…"
                                    rows={4}
                                    className="w-full bg-transparent text-xs text-gray-300 placeholder:text-gray-700 border border-white/[0.06] rounded-lg p-2 focus:outline-none focus:border-white/20 resize-y"
                                  />
                                  <input
                                    type="text"
                                    value={runNoteInputs[runKey] ?? ""}
                                    onChange={(e) => setRunNoteInputs(prev => ({ ...prev, [runKey]: e.target.value }))}
                                    placeholder="Operator note (optional)…"
                                    className="w-full bg-transparent text-xs text-gray-400 placeholder:text-gray-700 border border-white/[0.06] rounded-lg p-2 focus:outline-none focus:border-white/20"
                                  />
                                  <button
                                    onClick={() => saveExecutionRun(rev.id, bi)}
                                    disabled={runSaving === runKey || !runReportInputs[runKey]?.trim()}
                                    className="px-3 py-1 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
                                  >
                                    {runSaving === runKey ? "Saving…" : "Save Execution Run"}
                                  </button>
                                </div>
                                {/* Run history */}
                                {batchRuns.map((run) => {
                                  const isExpanded = expandedRuns.has(run.id);
                                  const qaStatus = run.qa_status ?? "pending";
                                  return (
                                    <div key={run.id} className={cx(
                                      "rounded-lg bg-white/[0.01] p-3 border",
                                      qaStatus === "passed" ? "border-green-500/30" :
                                      qaStatus === "failed" ? "border-red-500/30" :
                                      "border-white/[0.04]"
                                    )}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[10px] text-gray-600">
                                            {new Date(run.created_at).toLocaleDateString("en-IE", { day: "numeric", month: "short" })}, {new Date(run.created_at).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                          {run.operator_note && <span className="text-[10px] text-gray-500 italic">{run.operator_note}</span>}
                                          {/* QA status selector */}
                                          <select
                                            value={qaStatus}
                                            onChange={(e) => updateRunQA(rev.id, run.id, { qa_status: e.target.value })}
                                            className={cx(
                                              "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border-0 cursor-pointer appearance-none",
                                              qaStatus === "passed" ? "bg-green-500/15 text-green-400" :
                                              qaStatus === "failed" ? "bg-red-500/15 text-red-400" :
                                              "bg-gray-500/15 text-gray-500"
                                            )}
                                          >
                                            <option value="pending">QA: pending</option>
                                            <option value="passed">QA: passed</option>
                                            <option value="failed">QA: failed</option>
                                          </select>
                                        </div>
                                        <button
                                          onClick={() => setExpandedRuns(prev => {
                                            const next = new Set(prev);
                                            if (next.has(run.id)) next.delete(run.id); else next.add(run.id);
                                            return next;
                                          })}
                                          className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors shrink-0"
                                        >
                                          {isExpanded ? "Hide" : "View report"}
                                        </button>
                                      </div>
                                      {isExpanded && (
                                        <pre className="mt-2 text-[11px] text-gray-400 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">{run.output_report}</pre>
                                      )}
                                      {/* QA notes */}
                                      <div className="mt-2 pt-1.5 border-t border-white/5">
                                        <input
                                          type="text"
                                          defaultValue={run.qa_notes ?? ""}
                                          onBlur={(e) => {
                                            const val = e.target.value;
                                            if (val !== (run.qa_notes ?? "")) {
                                              updateRunQA(rev.id, run.id, { qa_notes: val });
                                            }
                                          }}
                                          placeholder="QA notes…"
                                          className="w-full bg-transparent text-[11px] text-gray-500 placeholder:text-gray-700 focus:outline-none focus:text-gray-300"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Execution Task modal */}
        {taskPrompt !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setTaskPrompt(null)}>
            <div className="relative w-full max-w-3xl max-h-[80vh] mx-4 rounded-xl border border-white/10 bg-[#12131a] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-medium text-gray-200">Claude Code Execution Task</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(taskPrompt);
                      setTaskCopied(true);
                      setTimeout(() => setTaskCopied(false), 2000);
                    }}
                    className="px-3 py-1 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                  >
                    {taskCopied ? "✓ Copied" : "Copy to clipboard"}
                  </button>
                  <button onClick={() => setTaskPrompt(null)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto px-5 py-4 text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{taskPrompt}</pre>
            </div>
          </div>
        )}

        {/* Internal notes (full width, collapsed by default) */}
        <div>
          <div className="rounded-xl border border-white/[0.06] bg-[#12131a] overflow-hidden">
            <button
              type="button"
              onClick={() => setNotesOpen(!notesOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Internal Notes</span>
              <span className="text-xs text-gray-600">{notesOpen ? "▲" : "▼"}</span>
            </button>
            {notesOpen && (
              <div className="px-5 pb-4 border-t border-white/5">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes visible only in Hub…"
                  rows={4}
                  className="w-full bg-transparent text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed mt-3"
                />
                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                  <span className={cx("text-xs transition-opacity", notesSaved ? "text-green-400 opacity-100" : "opacity-0")}>
                    Saved
                  </span>
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save notes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            PROPOSAL WORKSPACE — unified linear proposal flow
            A. Commercial inputs → B. Prompt pack → C. Draft → D. Actions
            ════════════════════════════════════════════════════════════════ */}
        {briefEligible && (() => {
          const proposalComplete = ["proposal_sent", "client_approved", "deposit_requested", "in_build", "client_review", "revisions", "final_approval", "full_payment_requested", "complete"].includes(status);
          const proposalExists = !!proposal;
          return (
          <div id="proposal-engine">
            <Section title="Proposal Workspace">

              {/* ── Create entry point (shown only when no proposal exists) ── */}
              {proposalLoading ? (
                <p className="text-xs text-gray-500">Loading proposal…</p>
              ) : !proposalExists ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Start building the proposal. This creates a structured proposal record you can edit, generate a prompt from, and export as PDF.
                  </p>
                  {proposalError && <p className="text-xs text-red-400">{proposalError}</p>}
                  <button
                    type="button"
                    onClick={createProposal}
                    disabled={proposalSaving}
                    className="px-5 py-3 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                  >
                    {proposalSaving ? "Creating…" : "Create Proposal"}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">

                  {/* ── Header: status + links ── */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className={cx(
                        "px-2.5 py-1 rounded text-[11px] font-medium uppercase tracking-wide",
                        proposal.status === "draft" && "bg-gray-500/15 text-gray-400",
                        proposal.status === "ready" && "bg-indigo-500/15 text-indigo-400",
                        proposal.status === "sent" && "bg-blue-500/15 text-blue-400",
                        proposal.status === "viewed" && "bg-amber-500/15 text-amber-400",
                        ["approved", "signed", "deposit_received"].includes(proposal.status) && "bg-green-500/15 text-green-400",
                        proposal.status === "deposit_requested" && "bg-violet-500/15 text-violet-400",
                        proposal.status === "superseded" && "bg-gray-500/15 text-gray-600",
                      )}>
                        {proposal.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-gray-600">v{proposal.version_number}</span>
                      {proposal.terms_version && (
                        <span className="text-[10px] text-gray-600">· Terms v{proposal.terms_version}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {proposal.view_token && (
                        <>
                          <a href={`/proposal/${proposal.view_token}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">Preview ↗</a>
                          <button type="button" onClick={() => { const url = `${window.location.origin}/proposal/${proposal.view_token}`; navigator.clipboard.writeText(url).then(() => { setProposalSaved(true); setTimeout(() => setProposalSaved(false), 2000); }); }} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Copy link</button>
                          <span className="text-white/10">|</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Approval status */}
                  {proposal.approved_at && (
                    <div className="px-3 py-2 rounded-lg bg-green-500/[0.06] border border-green-500/20">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        <span className="text-green-400 font-medium">Approved</span>
                        <span className="text-gray-600">by</span>
                        <span className="text-gray-400">{proposal.approved_by_name ?? "—"}</span>
                        {proposal.approved_by_company && <span className="text-gray-600">({proposal.approved_by_company})</span>}
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-600">{new Date(proposal.approved_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  )}

                  {/* ═══════ A. COMMERCIAL INPUTS ═══════ */}
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-3">Commercial inputs</p>
                    <p className="text-[10px] text-gray-600 mb-3">Review and adjust before generating the proposal prompt. Editing here does not change the internal analysis — only the proposal-facing values.</p>

                    {/* Fill from reviewed brief — pre-fill commercial inputs */}
                    {proposal.status === "draft" && (
                      <div className="mb-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => runProposalAutofill(false)}
                            disabled={autofillRunning || proposalSaving}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
                          >
                            {autofillRunning ? "Filling…" : "Fill from reviewed brief"}
                          </button>
                          {autofillResult && (
                            <span className={cx("text-[10px]", autofillResult.confidence === "high" ? "text-green-400" : autofillResult.confidence === "medium" ? "text-amber-400" : "text-red-400")}>
                              {autofillResult.confidence} confidence{autofillResult.fields_updated?.length > 0 ? ` · ${autofillResult.fields_updated.length} fields filled` : " · no fields updated"}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1">Pulls summary, solution, timeline, price, and running costs from the approved analysis into the fields below.</p>
                      </div>
                    )}

                    {/* Title */}
                    <div className="mb-3">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium block mb-1">Proposal title</label>
                      <input type="text" value={proposal.title ?? ""} onChange={(e) => setProposal(p => p ? { ...p, title: e.target.value } : p)} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60" placeholder="e.g. Web Application Proposal — ClientCo" />
                    </div>

                    {/* Price / deposit / timeline row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium block mb-1">Build price (€)</label>
                        <input type="number" value={proposal.build_price ?? ""} onChange={(e) => setProposal(p => p ? { ...p, build_price: e.target.value ? Number(e.target.value) : null } : p)} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60" />
                        {buildPricing && proposal.build_price !== null && Number(proposal.build_price) !== effectiveBuildPrice && (
                          <p className="text-[9px] text-gray-600 mt-0.5">Recommended: €{effectiveBuildPrice.toLocaleString()}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium block mb-1">Deposit %</label>
                        <input type="number" value={proposal.deposit_percent ?? 50} onChange={(e) => setProposal(p => p ? { ...p, deposit_percent: e.target.value ? Number(e.target.value) : 50 } : p)} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium block mb-1">Payment notes</label>
                        <input type="text" value={proposal.payment_notes ?? ""} onChange={(e) => setProposal(p => p ? { ...p, payment_notes: e.target.value } : p)} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60" placeholder="Bank details on invoice. Deposit to secure slot." />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium block mb-1">Valid until</label>
                        <input type="date" value={proposal.valid_until ?? ""} onChange={(e) => setProposal(p => p ? { ...p, valid_until: e.target.value } : p)} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60" />
                      </div>
                    </div>

                    {/* Scope summary fields */}
                    <div className="space-y-3 mb-3">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium block mb-1">Executive summary</label>
                        <textarea value={proposal.executive_summary ?? ""} onChange={(e) => setProposal(p => p ? { ...p, executive_summary: e.target.value } : p)} rows={3} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-y" placeholder="Brief overview of the project and proposed solution…" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium block mb-1">Recommended solution</label>
                        <textarea value={proposal.recommended_solution ?? ""} onChange={(e) => setProposal(p => p ? { ...p, recommended_solution: e.target.value } : p)} rows={3} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-y" placeholder="What we recommend building…" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide font-medium block mb-1">Timeline summary</label>
                        <textarea value={proposal.timeline_summary ?? ""} onChange={(e) => setProposal(p => p ? { ...p, timeline_summary: e.target.value } : p)} rows={2} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-y" placeholder="Estimated timeline and delivery approach…" />
                      </div>
                    </div>

                    {/* Save commercial inputs */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cx("text-xs transition-opacity", proposalSaved ? "text-green-400 opacity-100" : "opacity-0")}>Saved</span>
                        <span className="text-[10px] text-gray-700">Last updated {proposal.updated_at ? fmtDateTime(proposal.updated_at) : "—"}</span>
                      </div>
                      <button
                        onClick={() => { if (!proposal) return; saveProposal({ title: proposal.title, executive_summary: proposal.executive_summary, problem_statement: proposal.problem_statement, recommended_solution: proposal.recommended_solution, timeline_summary: proposal.timeline_summary, build_price: proposal.build_price, deposit_percent: proposal.deposit_percent, payment_notes: proposal.payment_notes, valid_until: proposal.valid_until }); }}
                        disabled={proposalSaving}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                      >
                        {proposalSaving ? "Saving…" : "Save inputs"}
                      </button>
                    </div>
                  </div>

                  {/* ═══════ B. PROMPT PACK ═══════ */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">ChatGPT proposal prompt</p>
                      {!proposalComplete ? (
                        <button
                          type="button"
                          disabled={!briefSummary.trim() && !proposal?.executive_summary?.trim()}
                          onClick={() => { setBriefPromptOutput(buildBriefPrompt()); setBriefPromptCopied(false); }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Generate prompt
                        </button>
                      ) : briefPromptOutput ? (
                        <span className="text-[10px] text-green-400/60">✓ Generated</span>
                      ) : null}
                    </div>
                    {!briefSummary.trim() && !proposal?.executive_summary?.trim() && !briefPromptOutput && (
                      <p className="text-xs text-gray-700">Fill the commercial inputs above first, or run analysis.</p>
                    )}
                    {briefPromptOutput && (
                      <div className="relative">
                        <textarea readOnly value={briefPromptOutput} rows={12} className="w-full bg-[#0a0b0e] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono resize-y focus:outline-none leading-relaxed" />
                        <button type="button" onClick={() => { navigator.clipboard.writeText(briefPromptOutput); setBriefPromptCopied(true); setTimeout(() => setBriefPromptCopied(false), 2000); }} className="absolute top-2 right-2 px-2.5 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                          {briefPromptCopied ? "Copied ✓" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ═══════ C. PROPOSAL DRAFT ═══════ */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Proposal draft{proposalComplete && briefProposal.trim() ? " (sent)" : ""}</p>
                      {briefProposal.trim() && (
                        <button type="button" onClick={() => { navigator.clipboard.writeText(briefProposal); setProposalCopied(true); setTimeout(() => setProposalCopied(false), 2000); }} className="px-2.5 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                          {proposalCopied ? "Copied ✓" : "Copy draft"}
                        </button>
                      )}
                    </div>
                    {proposalComplete ? (
                      briefProposal.trim() ? (
                        <textarea readOnly value={briefProposal} rows={6} className="w-full bg-[#0a0b0e] border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none resize-y cursor-default" />
                      ) : (
                        <p className="text-xs text-gray-600">No draft was saved before sending.</p>
                      )
                    ) : (
                      <textarea value={briefProposal} onChange={(e) => setBriefProposal(e.target.value)} placeholder="Paste ChatGPT output or write the proposal draft here." rows={8} className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-y" />
                    )}
                  </div>

                  {/* ═══════ D. FINAL ACTIONS ═══════ */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Save draft */}
                      {!proposalComplete && (
                        <button onClick={saveBrief} disabled={briefSaving} className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50">
                          {briefSaving ? "Saving…" : "Save draft"}
                        </button>
                      )}

                      {/* Export PDF */}
                      <button type="button" onClick={generateProposalPdf} disabled={pdfGenerating || proposalSaving} className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50">
                        {pdfGenerating ? "Generating PDF…" : proposal.pdf_url ? "Regenerate PDF" : "Export PDF"}
                      </button>
                      {proposal.pdf_url && (
                        <a href={proposal.pdf_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">View PDF ↗</a>
                      )}

                      {/* Mark as sent */}
                      {status === "ready_for_proposal" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm("Mark this proposal as sent? This advances the lead to Proposal Sent.")) return;
                            saveField({ status: "proposal_sent" });
                            setStatus("proposal_sent");
                          }}
                          disabled={saving}
                          className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                        >
                          {saving ? "Updating…" : "Mark as Sent"}
                        </button>
                      )}

                      {/* Post-send lifecycle actions */}
                      {status === "proposal_sent" && (
                        <button type="button" onClick={() => { saveField({ status: "client_approved" }); setStatus("client_approved"); }} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50">
                          {saving ? "Updating…" : "Mark Approved"}
                        </button>
                      )}
                      {status === "client_approved" && (
                        <button type="button" onClick={() => { saveField({ status: "deposit_requested" }); setStatus("deposit_requested"); }} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-medium bg-amber-600/80 hover:bg-amber-600 text-white transition-colors disabled:opacity-50">
                          {saving ? "Updating…" : "Request Deposit"}
                        </button>
                      )}
                      {status === "deposit_requested" && (
                        <button type="button" onClick={() => setShowConvert(true)} className="px-4 py-2 rounded-lg text-xs font-medium bg-green-600/80 hover:bg-green-600 text-white transition-colors">
                          Activate Deposit
                        </button>
                      )}
                    </div>

                    {proposalError && <p className="text-xs text-red-400 mt-2">{proposalError}</p>}

                    {/* Saved confirmation */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={cx("text-xs transition-opacity", briefSaved ? "text-green-400 opacity-100" : "opacity-0")}>Saved</span>
                      {brief && <span className="text-[10px] text-gray-700">Last updated {fmtDateTime(brief.updated_at)}</span>}
                    </div>
                  </div>

                </div>
              )}
            </Section>

            {/* ── Contact method modal ────────────────────────────── */}
            {showCallModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-[#141519] border border-white/10 rounded-xl w-full max-w-lg mx-4 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-200">Speak to client</h3>
                    <button type="button" onClick={() => setShowCallModal(false)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <p className="text-xs text-gray-400">Choose how to reach the client. The email text will be copied to your clipboard.</p>
                    <button type="button" onClick={() => { const name = lead?.contact_name?.split(" ")[0] ?? "there"; navigator.clipboard.writeText(`Hi ${name},\n\nThanks for the detailed replies \u2014 a quick call will help clarify a few points and avoid unnecessary back-and-forth.\n\nYou can pick a time that suits you here:\n[Microsoft Bookings link]\n\nBest\nPhil`); setContactStrategy("bookings"); setShowCallModal(false); }} className="w-full text-left px-4 py-3 rounded-lg border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-colors group">
                      <span className="text-xs font-medium text-gray-200 group-hover:text-indigo-300">Send booking link</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">Microsoft Bookings — client picks a time</p>
                    </button>
                    <button type="button" onClick={() => { const name = lead?.contact_name?.split(" ")[0] ?? "there"; navigator.clipboard.writeText(`Hi ${name},\n\nThanks for the information so far. It might be easier to run through a few details on a quick call.\n\nWould you be available for a 15\u201320 minute Microsoft Teams call this week?\n\nIf so, let me know a time that suits and I\u2019ll send a meeting invite.\n\nBest\nPhil`); setContactStrategy("teams"); setShowCallModal(false); }} className="w-full text-left px-4 py-3 rounded-lg border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-colors group">
                      <span className="text-xs font-medium text-gray-200 group-hover:text-indigo-300">Offer Microsoft Teams call</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">15–20 minute video call — you send the invite</p>
                    </button>
                    <button type="button" onClick={() => { const name = lead?.contact_name?.split(" ")[0] ?? "there"; navigator.clipboard.writeText(`Hi ${name},\n\nThanks for the detailed replies so far. A quick call might be the easiest way to clarify a few things.\n\nIf you\u2019d prefer, I\u2019m happy to give you a quick ring to run through it.\n\nJust let me know a time that suits you and the best number to reach you on.\n\nBest\nPhil`); setContactStrategy("phone"); setShowCallModal(false); }} className="w-full text-left px-4 py-3 rounded-lg border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-colors group">
                      <span className="text-xs font-medium text-gray-200 group-hover:text-indigo-300">Offer phone call</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">For less technical clients — you ring them</p>
                    </button>
                    <p className="text-[10px] text-gray-600 pt-2 border-t border-white/5">Email text will be copied to clipboard. Send via your email client.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ); })()}

        {/* Project (if converted) */}
        {project && (
          <div>
            <Section title="Project">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Row label="Project ID"     value={<span className="font-mono text-xs text-gray-400">{project.id.slice(0, 8).toUpperCase()}</span>} />
                  <Row label="Status"         value={
                    <div>
                      <select
                        value={project.project_status ?? ""}
                        onChange={(e) => updateProjectStatus(project.id, e.target.value)}
                        className="bg-[#0e0f14] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/60"
                      >
                        {PROJECT_STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-[#0e0f14] text-gray-300">{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                      {reviewLimitError && (
                        <p className="text-xs text-red-400 mt-1">{reviewLimitError}</p>
                      )}
                    </div>
                  } />
                  <Row label="Hosting"        value={project.hosting_required ? "Yes" : "No"} />
                  <Row label="Maint. plan"    value={project.maintenance_plan ?? "—"} />
                  <Row label="Maint. status"  value={project.maintenance_status ?? "—"} />
                  <Row label="Reviews" value={
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-200">{project.reviews_used} / {reviewsIncluded} used</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={reviewsIncluded}
                          onChange={(e) => setReviewsIncluded(Number(e.target.value))}
                          onBlur={(e) => { setReviewLimitError(""); saveProjectField(project.id, { reviews_included: Number(e.target.value) }); }}
                          className="w-12 bg-[#0e0f14] border border-white/10 rounded px-1.5 py-0.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/60"
                        />
                        <span className="text-xs text-gray-600">incl.</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">Landing=1 · 2–5 pages=2 · 6–10 pages=3 · 10+=4</p>
                    </div>
                  } />
                  {project.delivery_completed_at && (
                    <Row label="Delivered"    value={fmt(project.delivery_completed_at)} />
                  )}
                </div>
                <div>
                  {project.sharepoint_folder_url && (
                    <Row label="SP Folder" value={
                      <a href={project.sharepoint_folder_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs break-all">
                        Open folder →
                      </a>
                    } />
                  )}
                  {project.sharepoint_folder_error && !project.sharepoint_folder_error.includes("not configured") && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400">SharePoint folder error: {project.sharepoint_folder_error}</p>
                    </div>
                  )}
                  {!project.sharepoint_folder_url && !project.sharepoint_folder_error && (
                    <Row label="SP Folder" value={<span className="text-gray-600 text-xs">Creating…</span>} />
                  )}
                </div>
              </div>

              {/* ── Portal link action ────────────────────────────────────── */}
              <div className="pt-4 mt-1 border-t border-white/5 flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500 w-36 shrink-0">
                  Intake portal
                  {project.intake_status && project.intake_status !== "not_sent" && (
                    <span className={cx(
                      "ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
                      project.intake_status === "complete"    ? "bg-green-500/15 text-green-400" :
                      project.intake_status === "in_progress" ? "bg-yellow-500/15 text-yellow-400" :
                      "bg-indigo-500/15 text-indigo-400"
                    )}>
                      {project.intake_status.replace("_", " ")}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {!portalSent ? (
                    <>
                      <button
                        type="button"
                        onClick={() => sendPortalLink(project.id)}
                        disabled={portalSending}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                      >
                        {portalSending ? "Sending…" : "Send portal link"}
                      </button>
                      {portalError && (
                        <span className="text-xs text-red-400">{portalError}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-green-400 font-medium">Link sent ✓</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(portalUrl)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors"
                      >
                        Copy link
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── Client portal (progress view) ──────────────────────── */}
              {project.intake_token && (
                <div className="pt-4 mt-1 border-t border-white/5 flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-36 shrink-0">Client portal</span>
                  <a
                    href={`/projects/${project.intake_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Open portal →
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/projects/${project.intake_token}`)}
                    className="px-2 py-1 rounded text-[10px] font-medium border border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
              )}

              {/* ── View intake ───────────────────────────────────── */}
              <div className="pt-4 mt-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => toggleIntake(project.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {intakeOpen ? "Hide intake ↑" : "View intake ↓"}
                </button>

                {intakeOpen && (
                  <div className="mt-4">
                    {intakeLoading && (
                      <p className="text-xs text-gray-500 py-2">Loading…</p>
                    )}
                    {intakeError && (
                      <p className="text-xs text-red-400 py-2">{intakeError}</p>
                    )}
                    {intakeData && !intakeLoading && (
                      <div className="space-y-4">

                        {/* Submitted timestamp */}
                        {intakeData.intake?.completed_at && (
                          <p className="text-xs text-green-400 font-medium">
                            Submitted {fmt(intakeData.intake.completed_at)}
                          </p>
                        )}

                        {/* Step 1 — Basics */}
                        {intakeData.intake?.step1 && (
                          <div>
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">
                              Step 1 — Basics
                            </p>
                            <Row label="Contact name" value={intakeData.intake.step1.contact_name ?? ""} />
                            <Row label="Project name" value={intakeData.intake.step1.project_name ?? ""} />
                            {intakeData.intake.step1.goals && (
                              <div className="flex items-start gap-4 py-1.5">
                                <span className="text-xs text-gray-500 w-36 shrink-0 mt-0.5">Goals</span>
                                <span className="text-sm text-gray-200 flex-1 whitespace-pre-wrap leading-relaxed">
                                  {intakeData.intake.step1.goals}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 2 — Brand */}
                        {intakeData.intake?.step2 && (
                          <div className="pt-3 border-t border-white/5">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5">
                              Step 2 — Brand
                            </p>
                            <Row label="Headline"    value={intakeData.intake.step2.headline    ?? ""} />
                            {intakeData.intake.step2.subheadline && (
                              <Row label="Subheadline" value={intakeData.intake.step2.subheadline} />
                            )}
                            {intakeData.intake.step2.services && intakeData.intake.step2.services.length > 0 && (
                              <div className="flex items-start gap-4 py-1.5">
                                <span className="text-xs text-gray-500 w-36 shrink-0 mt-0.5">Services</span>
                                <ul className="text-sm text-gray-200 flex-1 space-y-0.5 list-none p-0 m-0">
                                  {intakeData.intake.step2.services.map((s, i) => (
                                    <li key={i}>· {s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {intakeData.intake.step2.about && (
                              <div className="flex items-start gap-4 py-1.5">
                                <span className="text-xs text-gray-500 w-36 shrink-0 mt-0.5">About</span>
                                <span className="text-sm text-gray-200 flex-1 whitespace-pre-wrap leading-relaxed">
                                  {intakeData.intake.step2.about}
                                </span>
                              </div>
                            )}
                            <Row
                              label="Primary CTA"
                              value={
                                CTA_LABELS[intakeData.intake.step2.primary_cta ?? ""] ??
                                intakeData.intake.step2.primary_cta ?? ""
                              }
                            />
                          </div>
                        )}

                        {/* Empty state — intake row exists but no steps saved */}
                        {!intakeData.intake && (
                          <p className="text-xs text-gray-600">No intake data yet.</p>
                        )}

                      </div>
                    )}
                  </div>
                )}
              </div>

            </Section>
          </div>
        )}

        {/* ── Project Context (only when project exists) ────────────────── */}
        {project && (
          <div>
            <Section title="Project Context">
              <p className="text-xs text-gray-600 -mt-1 mb-3">
                Canonical internal context for this project. Used to generate execution packs and AI-ready prompts without re-explaining the project each time.
              </p>

              {contextLoading ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-gray-600">Loading context…</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Business summary</label>
                      <textarea
                        value={ctxBusiness}
                        onChange={(e) => setCtxBusiness(e.target.value)}
                        placeholder="What the client's business does…"
                        rows={3}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Project summary</label>
                      <textarea
                        value={ctxProject}
                        onChange={(e) => setCtxProject(e.target.value)}
                        placeholder="What we are building / delivering…"
                        rows={3}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Current stack</label>
                      <textarea
                        value={ctxStack}
                        onChange={(e) => setCtxStack(e.target.value)}
                        placeholder="Next.js, Supabase, Tailwind…"
                        rows={2}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Key URLs</label>
                      <textarea
                        value={ctxUrls}
                        onChange={(e) => setCtxUrls(e.target.value)}
                        placeholder="Live site, staging, repo, docs…"
                        rows={2}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Constraints</label>
                    <textarea
                      value={ctxConstraints}
                      onChange={(e) => setCtxConstraints(e.target.value)}
                      placeholder="Budget limits, deadlines, technical restrictions…"
                      rows={2}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">AI notes</label>
                      <textarea
                        value={ctxAiNotes}
                        onChange={(e) => setCtxAiNotes(e.target.value)}
                        placeholder="Notes for AI tools: patterns, conventions, gotchas…"
                        rows={3}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Acceptance notes</label>
                      <textarea
                        value={ctxAcceptance}
                        onChange={(e) => setCtxAcceptance(e.target.value)}
                        placeholder="What 'done' looks like for this project…"
                        rows={3}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={cx("text-xs transition-opacity", contextSaved ? "text-green-400 opacity-100" : "opacity-0")}>
                        Saved
                      </span>
                      {context && (
                        <span className="text-[10px] text-gray-700">
                          Last updated {fmtDateTime(context.updated_at)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => saveContext(project.id)}
                      disabled={contextSaving}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                    >
                      {contextSaving ? "Saving…" : "Save context"}
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ── Revisions workspace (only when project exists) ───────────── */}
        {project && (
          <div>
            <Section title="Revisions">
              {/* Section explainer */}
              <p className="text-xs text-gray-600 -mt-1 mb-3">
                Track revision items from client feedback, emails, or internal notes. Add items, manage priorities, and generate execution batches.
              </p>

              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {revisions.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {revisions.length} item{revisions.length !== 1 ? 's' : ''}
                      {revisions.filter(r => r.status === 'queued').length > 0 && (
                        <span className="ml-1.5 text-yellow-400">
                          ({revisions.filter(r => r.status === 'queued').length} queued)
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchRevisions(project.id)}
                    disabled={revisionsLoading}
                    className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40"
                  >
                    {revisionsLoading ? "Refreshing…" : "↺ Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRevAddFeedbackId(null); setRevAddOpen(!revAddOpen); }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    + Add revision
                  </button>
                </div>
              </div>

              {revisionsError && (
                <div className="flex items-center gap-2 py-2 px-3 mb-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <span className="text-xs text-red-400">{revisionsError}</span>
                  <button
                    type="button"
                    onClick={() => { setRevisionsError(""); fetchRevisions(project.id); }}
                    className="text-[10px] text-red-400 underline hover:text-red-300"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* ── Quick add form ───────────────────────────────────── */}
              {revAddOpen && (
                <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-3">
                  <input
                    type="text"
                    value={revAddTitle}
                    onChange={(e) => setRevAddTitle(e.target.value)}
                    placeholder="Revision title…"
                    className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
                  />
                  <textarea
                    value={revAddDesc}
                    onChange={(e) => setRevAddDesc(e.target.value)}
                    placeholder="Description…"
                    rows={3}
                    className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1">Type</label>
                      <select
                        value={revAddType}
                        onChange={(e) => setRevAddType(e.target.value)}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/60"
                      >
                        {REVISION_TYPES.map((t) => (
                          <option key={t} value={t} className="bg-[#0e0f14]">{REVISION_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1">Priority</label>
                      <select
                        value={revAddPriority}
                        onChange={(e) => setRevAddPriority(e.target.value)}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/60"
                      >
                        {REVISION_PRIORITIES.map((p) => (
                          <option key={p} value={p} className="bg-[#0e0f14]">{REVISION_PRIORITY_LABELS[p]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600 block mb-1">Source</label>
                      <select
                        value={revAddSource}
                        onChange={(e) => setRevAddSource(e.target.value)}
                        className="w-full bg-[#0e0f14] border border-white/10 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/60"
                      >
                        {REVISION_SOURCES.map((s) => (
                          <option key={s} value={s} className="bg-[#0e0f14]">{REVISION_SOURCE_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {revAddFeedbackId && (
                    <p className="text-[10px] text-indigo-400">Linked to feedback event</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => createRevision(project.id)}
                      disabled={revSaving || !revAddTitle.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                    >
                      {revSaving ? "Creating…" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevAddOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ── Revisions list ───────────────────────────────────── */}
              {revisionsLoading && revisions.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-xs text-gray-600">Loading revisions…</p>
                </div>
              )}
              {!revisionsLoading && !revisionsError && revisions.length === 0 && !revAddOpen && (
                <div className="py-6 text-center border border-dashed border-white/5 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">No revisions yet</p>
                  <p className="text-xs text-gray-600 mb-3">
                    Add revision items manually, or create them from client feedback in the timeline below.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setRevAddFeedbackId(null); setRevAddOpen(true); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    + Add first revision
                  </button>
                </div>
              )}
              {revisions.length > 0 && (
                <div className="space-y-2">
                  {revisions.map((rev) => (
                    <div key={rev.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Status control */}
                        <select
                          value={rev.status}
                          onChange={(e) => updateRevision(project.id, rev.id, { status: e.target.value })}
                          className={cx(
                            "shrink-0 mt-0.5 bg-transparent border rounded px-1.5 py-0.5 text-[10px] font-medium focus:outline-none",
                            rev.status === 'complete'    ? "border-green-500/30 text-green-400" :
                            rev.status === 'in_progress' ? "border-yellow-500/30 text-yellow-400" :
                            "border-white/10 text-gray-500"
                          )}
                        >
                          {REVISION_STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-[#0e0f14]">{REVISION_STATUS_LABELS[s]}</option>
                          ))}
                        </select>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <p className={cx(
                            "text-sm font-medium leading-snug",
                            rev.status === 'complete' ? "text-gray-500 line-through" : "text-gray-200"
                          )}>
                            {rev.title}
                          </p>
                          {rev.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rev.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-400">
                              {REVISION_TYPE_LABELS[rev.revision_type] ?? rev.revision_type}
                            </span>
                            <select
                              value={rev.priority}
                              onChange={(e) => updateRevision(project.id, rev.id, { priority: e.target.value })}
                              className={cx(
                                "bg-transparent border rounded px-1 py-0.5 text-[10px] font-medium focus:outline-none cursor-pointer",
                                rev.priority === 'high'   ? "border-red-500/30 text-red-400" :
                                rev.priority === 'medium' ? "border-yellow-500/30 text-yellow-400" :
                                "border-white/10 text-gray-500"
                              )}
                            >
                              {REVISION_PRIORITIES.map((p) => (
                                <option key={p} value={p} className="bg-[#0e0f14]">{REVISION_PRIORITY_LABELS[p]}</option>
                              ))}
                            </select>
                            <span className="text-[10px] text-gray-600">
                              {REVISION_SOURCE_LABELS[rev.source] ?? rev.source}
                            </span>
                            {rev.batch_label && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {rev.batch_label}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-700">{fmt(rev.created_at)}</span>
                          </div>
                        </div>

                        {/* Type control */}
                        <select
                          value={rev.revision_type}
                          onChange={(e) => updateRevision(project.id, rev.id, { revision_type: e.target.value })}
                          className="shrink-0 bg-transparent border border-white/5 rounded px-1 py-0.5 text-[10px] text-gray-500 focus:outline-none"
                        >
                          {REVISION_TYPES.map((t) => (
                            <option key={t} value={t} className="bg-[#0e0f14]">{REVISION_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                      </div>

                      {/* Batch label inline edit */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-gray-600">Batch:</span>
                        <input
                          type="text"
                          defaultValue={rev.batch_label ?? ""}
                          placeholder="—"
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== rev.batch_label) updateRevision(project.id, rev.id, { batch_label: v });
                          }}
                          className="flex-1 max-w-[200px] bg-transparent border-b border-white/5 text-[10px] text-gray-400 placeholder:text-gray-700 focus:outline-none focus:border-indigo-500/60 py-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Execution pack + prompt outputs ────────────────────── */}
              {revisions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Execution pack</span>
                    {(() => {
                      const eligible = revisions.filter(r => r.status !== 'complete').length;
                      return (
                        <div className="flex items-center gap-2">
                          {eligible === 0 && (
                            <span className="text-[10px] text-gray-600">All items complete</span>
                          )}
                          <button
                            type="button"
                            onClick={() => generateBatch(project.id)}
                            disabled={batchLoading || eligible === 0}
                            title={eligible === 0 ? "No active revisions" : `Raw batch from ${eligible} item${eligible !== 1 ? 's' : ''}`}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-medium border border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {batchLoading ? "…" : "Raw batch"}
                          </button>
                          <button
                            type="button"
                            onClick={() => generateExecutionPack(project.id)}
                            disabled={execPackLoading || eligible === 0}
                            title={eligible === 0 ? "No queued or in-progress revisions" : `Generate execution pack from ${eligible} active revision${eligible !== 1 ? 's' : ''} + project context`}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {execPackLoading ? "Generating…" : `Generate pack${eligible > 0 ? ` (${eligible})` : ''}`}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Raw batch output (legacy, collapsed) */}
                  {batchOutput && (
                    <details className="mb-3">
                      <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400 mb-1">Raw batch JSON</summary>
                      <div className="relative">
                        <textarea
                          readOnly
                          value={batchOutput}
                          rows={8}
                          className="w-full bg-[#0a0b0e] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono resize-y focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(batchOutput)}
                          className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </details>
                  )}

                  {/* Execution pack prompt outputs */}
                  {execPack && (
                    <div>
                      {/* Tab bar */}
                      <div className="flex items-center gap-1 mb-2 border-b border-white/5 pb-2">
                        {([
                          { key: 'chatgpt' as const, label: 'ChatGPT Architect' },
                          { key: 'claude' as const,  label: 'Claude Code' },
                          { key: 'json' as const,    label: 'Pack JSON' },
                        ]).map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setExecPackTab(tab.key)}
                            className={cx(
                              "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                              execPackTab === tab.key
                                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                                : "text-gray-500 hover:text-gray-300 border border-transparent"
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                        <span className="flex-1" />
                        <span className="text-[10px] text-gray-700">
                          {execPack.summary.total_items} items · {new Date(execPack.generated_at).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Prompt content */}
                      <div className="relative">
                        <textarea
                          readOnly
                          value={
                            execPackTab === 'chatgpt' ? buildChatGptPrompt(execPack) :
                            execPackTab === 'claude'  ? buildClaudePrompt(execPack) :
                            JSON.stringify(execPack, null, 2)
                          }
                          rows={16}
                          className="w-full bg-[#0a0b0e] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono resize-y focus:outline-none leading-relaxed"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const text =
                              execPackTab === 'chatgpt' ? buildChatGptPrompt(execPack) :
                              execPackTab === 'claude'  ? buildClaudePrompt(execPack) :
                              JSON.stringify(execPack, null, 2);
                            navigator.clipboard.writeText(text);
                          }}
                          className="absolute top-2 right-2 px-2.5 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {!execPack && !batchOutput && (
                    <p className="text-xs text-gray-700">
                      Generate an execution pack to get copy-ready ChatGPT and Claude Code prompts with full project context.
                    </p>
                  )}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* Timeline (only when project exists) */}
        {project && (
          <div>
            <Section title="Timeline">
              <div className="flex justify-end -mt-1 mb-3">
                <button
                  type="button"
                  onClick={() => fetchEvents(project.id)}
                  disabled={eventsLoading}
                  className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40"
                >
                  {eventsLoading ? "Refreshing…" : "↺ Refresh"}
                </button>
              </div>
              {eventsLoading && (
                <p className="text-xs text-gray-600 py-1">Loading…</p>
              )}
              {eventsError && (
                <p className="text-xs text-red-400 py-1">{eventsError}</p>
              )}
              {!eventsLoading && !eventsError && events.length === 0 && (
                <p className="text-xs text-gray-600 py-1">No events yet.</p>
              )}
              {!eventsLoading && events.length > 0 && (
                <ol className="space-y-3">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">{eventIcon(ev)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-300 leading-snug">{eventLabel(ev)}</p>
                        {ev.event_type === 'client_revision_requested' && typeof ev.meta?.message === 'string' && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ev.meta.message}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-0.5">{fmtDateTime(ev.created_at)}</p>
                      </div>
                      {ev.event_type === 'client_revision_requested' && (
                        <button
                          type="button"
                          onClick={() => prefillRevisionFromFeedback(ev)}
                          title="Create a revision item from this client feedback"
                          className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                        >
                          Create revision →
                        </button>
                      )}
                      {(ev.event_type === 'client_review_approved' || ev.event_type === 'client_meeting_requested') && (
                        <span className="shrink-0 px-2 py-1 rounded text-[10px] font-medium text-emerald-400/60 border border-emerald-500/10">
                          {ev.event_type === 'client_review_approved' ? '✓ Approved' : '📅 Meeting'}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        )}
      </div>

      {/* Deposit activation modal */}
      {showConvert && (
        <DepositActivationModal
          lead={lead}
          onClose={() => setShowConvert(false)}
          onActivated={() => {
            setShowConvert(false);
            fetchLead();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
