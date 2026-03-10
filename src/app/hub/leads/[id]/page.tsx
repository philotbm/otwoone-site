"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projectStatus";

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

type LeadStatus =
  | "lead_submitted"
  | "scoping_sent"
  | "scope_received"
  | "proposal_sent"
  | "deposit_requested"
  | "deposit_received"
  | "lost_pre_deposit"
  | "converted";

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
    internal_notes: string | null;
  } | null;
  projects: Project[] | null;
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

const STATUS_OPTIONS: LeadStatus[] = [
  "lead_submitted", "scoping_sent", "scope_received", "proposal_sent",
  "deposit_requested", "deposit_received", "lost_pre_deposit", "converted",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  lead_submitted:    "Enquiry submitted",
  scoping_sent:      "Scoping sent",
  scope_received:    "Scope received",
  proposal_sent:     "Proposal sent",
  deposit_requested: "Deposit requested",
  deposit_received:  "Deposit received",
  lost_pre_deposit:  "Lost",
  converted:         "Converted",
};

const NEXT_ACTION: Record<LeadStatus, string> = {
  lead_submitted:    "Next: send scoping template",
  scoping_sent:      "Next: wait for scope",
  scope_received:    "Next: prepare proposal",
  proposal_sent:     "Next: request deposit",
  deposit_requested: "Next: confirm deposit",
  deposit_received:  "Next: convert to project",
  lost_pre_deposit:  "Closed",
  converted:         "Converted",
};

const CTA_LABELS: Record<string, string> = {
  call:         "Phone call",
  email:        "Email",
  contact_form: "Contact form",
  whatsapp:     "WhatsApp",
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

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-600 text-sm">—</span>;
  const pct = (score / 5) * 100;
  const colour = score >= 4 ? "bg-green-500" : score >= 3 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={cx("h-full rounded-full", colour)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6">{score}/5</span>
    </div>
  );
}

// ─── Convert modal ─────────────────────────────────────────────────────────────

function ConvertModal({
  lead,
  onClose,
  onConverted,
}: {
  lead: Lead;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [hostingRequired, setHostingRequired] = useState(
    lead.proposed_hosting_required ?? true
  );
  const [maintenancePlan, setMaintenancePlan] = useState(
    lead.proposed_maintenance_plan ?? "essential"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleConvert() {
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
        }),
      });
      if (!result.ok) throw new Error(result.error);
      onConverted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0e0f14] border border-white/10 rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-white mb-1">Convert Lead</h2>
        <p className="text-xs text-gray-500 mb-6">Deposit confirmed — this will create a project.</p>

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
            onClick={handleConvert}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
          >
            {saving ? "Converting…" : "Convert"}
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

  // Local edit state
  const [status, setStatus]                     = useState<LeadStatus>("lead_submitted");
  const [discoveryDepth, setDiscoveryDepth]     = useState("");
  const [proposedHosting, setProposedHosting]   = useState<"yes" | "no" | "">("");
  const [proposedPlan, setProposedPlan]         = useState("");
  const [reviewsIncluded, setReviewsIncluded]   = useState(2);
  const [reviewLimitError, setReviewLimitError] = useState("");
  const [scopingError, setScopingError]         = useState("");

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
  const isConverted = lead.status === "converted";
  const canConvert  = lead.status === "deposit_received";

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

        {/* Convert button */}
        {!isConverted && canConvert && (
          <button
            onClick={() => setShowConvert(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Convert (Deposit Paid)
          </button>
        )}
        {!isConverted && !canConvert && (
          <span className="text-xs text-gray-600">Convert available after Deposit received.</span>
        )}
        {isConverted && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            Converted
          </span>
        )}
      </header>

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

      <div className="px-6 py-6 max-w-4xl mx-auto grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Client info */}
        <Section title="Client info">
          <Row label="Name"         value={lead.contact_name} />
          <Row label="Email"        value={<a href={`mailto:${lead.contact_email}`} className="text-indigo-400 hover:text-indigo-300">{lead.contact_email}</a>} />
          <Row label="Company"      value={lead.company_name} />
          <Row label="Website"      value={lead.company_website ? <a href={lead.company_website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">{lead.company_website}</a> : null} />
          <Row label="Role"         value={lead.role} />
          <Row label="Authority"    value={AUTHORITY_LABELS[lead.decision_authority ?? ""] ?? lead.decision_authority} />
        </Section>

        {/* Submission details */}
        <Section title="Submission details">
          <Row label="Engagement"   value={ENGAGEMENT_LABELS[lead.engagement_type ?? ""] ?? lead.engagement_type} />
          <Row label="Budget"       value={BUDGET_LABELS[lead.budget ?? ""] ?? lead.budget} />
          <Row label="Timeline"     value={TIMELINE_LABELS[lead.timeline ?? ""] ?? lead.timeline} />
          {lead.lead_details?.clarifier_answers && Object.keys(lead.lead_details.clarifier_answers).length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Clarifiers</p>
              {Object.entries(lead.lead_details.clarifier_answers).map(([k, v]) => (
                <Row key={k} label={k.replace(/_/g, " ")} value={String(v)} />
              ))}
            </div>
          )}
          {lead.lead_details?.success_definition && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">Success definition</p>
              <p className="text-sm text-gray-300 leading-relaxed">{lead.lead_details.success_definition}</p>
            </div>
          )}
        </Section>

        {/* Internal scoring */}
        <Section title="Internal scoring">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">Clarity</span>
              <div className="flex-1"><ScoreBar score={lead.clarity_score} /></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">Alignment</span>
              <div className="flex-1"><ScoreBar score={lead.alignment_score} /></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">Complexity</span>
              <div className="flex-1"><ScoreBar score={lead.complexity_score} /></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">Authority</span>
              <div className="flex-1"><ScoreBar score={lead.authority_score} /></div>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">Total</span>
              <span className={cx(
                "text-base font-semibold",
                (lead.total_score ?? 0) >= 4 ? "text-green-400" :
                (lead.total_score ?? 0) >= 3 ? "text-yellow-400" : "text-red-400"
              )}>
                {lead.total_score?.toFixed(1) ?? "—"}/5
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24">Discovery rec.</span>
              <span className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                {lead.discovery_depth_suggested ?? "—"}
              </span>
            </div>
          </div>
        </Section>

        {/* Lead stage */}
        <Section title="Lead stage">
          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Stage</label>
              <select
                value={status}
                onChange={(e) => {
                  const v = e.target.value as LeadStatus;
                  setStatus(v);
                  saveField({ status: v });
                }}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-[#0e0f14] text-gray-200">{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">{NEXT_ACTION[status]}</p>

              {/* Quick action */}
              {status === "lead_submitted" && (
                lead.contact_email ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        setScopingError("");
                        setSaving(true);
                        const result = await safeFetch(`/api/hub/leads/${id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "scoping_sent" }),
                        });
                        setSaving(false);
                        if (!result.ok) {
                          setScopingError(result.error);
                          return;
                        }
                        setStatus("scoping_sent");
                        fetchLead();
                        window.location.href = `mailto:${lead.contact_email}?subject=${encodeURIComponent("OTwoOne — quick scoping questions")}&body=${encodeURIComponent(`Hi ${lead.contact_name ?? "there"},\nThanks for reaching out. To price this properly, can you reply with:\n1) What pages/sections you need\n2) Examples you like\n3) Deadline\n4) Any integrations (booking, payments, etc.)\nThanks,\nPhilip`)}`;
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                    >
                      Send scoping template
                    </button>
                    {scopingError && <p className="text-[11px] text-red-400 mt-1">{scopingError}</p>}
                  </div>
                ) : (
                  <div className="mt-3">
                    <button disabled className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 opacity-40 text-white cursor-not-allowed">
                      Send scoping template
                    </button>
                    <p className="text-[11px] text-gray-600 mt-1">No email on lead.</p>
                  </div>
                )
              )}
              {status === "deposit_received" && (
                <button
                  type="button"
                  onClick={() => setShowConvert(true)}
                  className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Convert to project
                </button>
              )}
            </div>

            {/* Discovery override — retired v1.17.1 */}
            {/* <div>
              <label className="text-xs text-gray-500 block mb-1.5">Discovery override</label>
              <select
                value={discoveryDepth}
                onChange={(e) => {
                  setDiscoveryDepth(e.target.value);
                  saveField({ discovery_depth: e.target.value || null });
                }}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60"
              >
                <option value="" className="bg-[#0e0f14] text-gray-200">— Use recommended ({lead.discovery_depth_suggested ?? "core"})</option>
                <option value="lite" className="bg-[#0e0f14] text-gray-200">Lite</option>
                <option value="core" className="bg-[#0e0f14] text-gray-200">Core</option>
                <option value="deep" className="bg-[#0e0f14] text-gray-200">Deep</option>
              </select>
            </div> */}

            {/* Proposed hosting — retired v1.17.1 */}
            {/* <div>
              <label className="text-xs text-gray-500 block mb-1.5">Hosting proposed</label>
              <select
                value={proposedHosting}
                onChange={(e) => {
                  setProposedHosting(e.target.value as "yes" | "no" | "");
                  saveField({ proposed_hosting_required: e.target.value === "yes" ? true : e.target.value === "no" ? false : null });
                }}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60"
              >
                <option value="" className="bg-[#0e0f14] text-gray-200">Not set</option>
                <option value="yes" className="bg-[#0e0f14] text-gray-200">Yes — hosting included</option>
                <option value="no" className="bg-[#0e0f14] text-gray-200">No — client hosts</option>
              </select>
            </div> */}

            {/* Proposed maintenance plan — retired v1.17.1 */}
            {/* <div>
              <label className="text-xs text-gray-500 block mb-1.5">Maintenance plan proposed</label>
              <select
                value={proposedPlan}
                onChange={(e) => {
                  setProposedPlan(e.target.value);
                  saveField({ proposed_maintenance_plan: e.target.value || null });
                }}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/60"
              >
                <option value="" className="bg-[#0e0f14] text-gray-200">Not set</option>
                {MAINTENANCE_PLANS.map((p) => (
                  <option key={p} value={p} className="bg-[#0e0f14] text-gray-200">
                    {MAINTENANCE_LABELS[p]}
                    {MAINTENANCE_MONTHLY[p] ? ` — €${MAINTENANCE_MONTHLY[p]}/mo` : ""}
                  </option>
                ))}
              </select>
            </div> */}
          </div>
        </Section>

        {/* Internal notes (full width) */}
        <div className="lg:col-span-2">
          <Section title="Internal notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes visible only in Hub…"
              rows={4}
              className="w-full bg-transparent text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none resize-none leading-relaxed"
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
                Save notes
              </button>
            </div>
          </Section>
        </div>

        {/* Project (if converted) */}
        {project && (
          <div className="lg:col-span-2">
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
                  {project.sharepoint_folder_error && (
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
          <div className="lg:col-span-2">
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
          <div className="lg:col-span-2">
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
          <div className="lg:col-span-2">
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

      {/* Convert modal */}
      {showConvert && (
        <ConvertModal
          lead={lead}
          onClose={() => setShowConvert(false)}
          onConverted={() => {
            setShowConvert(false);
            fetchLead();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
