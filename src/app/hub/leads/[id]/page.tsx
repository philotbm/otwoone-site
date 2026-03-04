"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projectStatus";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus =
  | "lead_submitted"
  | "discovery_active"
  | "proposal_sent"
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
  "lead_submitted", "discovery_active", "proposal_sent", "lost_pre_deposit", "converted",
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  lead_submitted:   "Submitted",
  discovery_active: "Discovery",
  proposal_sent:    "Proposal Sent",
  lost_pre_deposit: "Lost",
  converted:        "Converted",
};

const CTA_LABELS: Record<string, string> = {
  call:         "Phone call",
  email:        "Email",
  contact_form: "Contact form",
  whatsapp:     "WhatsApp",
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
      const res = await fetch(`/api/hub/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hosting_required: hostingRequired,
          maintenance_plan: hostingRequired ? maintenancePlan : "none",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Conversion failed");
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

  // Local edit state
  const [status, setStatus]                     = useState<LeadStatus>("lead_submitted");
  const [discoveryDepth, setDiscoveryDepth]     = useState("");
  const [proposedHosting, setProposedHosting]   = useState<"yes" | "no" | "">("");
  const [proposedPlan, setProposedPlan]         = useState("");
  const [reviewsIncluded, setReviewsIncluded]   = useState(2);
  const [reviewLimitError, setReviewLimitError] = useState("");

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/hub/leads/${id}`);
      const json = await res.json();
      const l: Lead = json.data;
      setLead(l);
      setStatus(l.status);
      setDiscoveryDepth(l.discovery_depth ?? "");
      setProposedHosting(l.proposed_hosting_required === true ? "yes" : l.proposed_hosting_required === false ? "no" : "");
      setProposedPlan(l.proposed_maintenance_plan ?? "");
      setReviewsIncluded(l.projects?.[0]?.reviews_included ?? 2);
      setNotes(l.lead_details?.internal_notes ?? "");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const fetchEvents = useCallback(async (projectId: string) => {
    setEventsLoading(true);
    setEventsError("");
    try {
      const res  = await fetch(`/api/hub/projects/${projectId}/events`);
      const json = await res.json() as { events?: ProjectEvent[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load events.");
      setEvents(json.events ?? []);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Failed to load events.");
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const projectId = lead?.projects?.[0]?.id;
  useEffect(() => { if (projectId) fetchEvents(projectId); }, [projectId, fetchEvents]);

  // ── Save lead fields ──────────────────────────────────────────────────────────

  async function saveField(fields: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/hub/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    await fetch(`/api/hub/leads/${id}`, {
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
      const res  = await fetch(`/api/hub/projects/${projectId}/send-intake`, { method: "POST" });
      const json = await res.json() as { ok?: boolean; intake_url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send portal link.");
      setPortalUrl(json.intake_url ?? "");
      setPortalSent(true);
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : "Failed to send portal link.");
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
      const res  = await fetch(`/api/hub/projects/${projectId}/intake`);
      const json = await res.json() as IntakeApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load intake.");
      setIntakeData(json);
    } catch (err) {
      setIntakeError(err instanceof Error ? err.message : "Failed to load intake.");
    } finally {
      setIntakeLoading(false);
    }
  }

  // ── Project field update (generic) ───────────────────────────────────────────

  async function saveProjectField(pId: string, fields: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/hub/projects/${pId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setSaving(false);
  }

  // ── Project status update ─────────────────────────────────────────────────────

  async function updateProjectStatus(projectId: string, newStatus: string) {
    setSaving(true);
    const res = await fetch(`/api/hub/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_status: newStatus }),
    });
    setSaving(false);
    if (res.status === 409) {
      const json = await res.json() as { error?: string };
      setReviewLimitError(json.error ?? "Review limit reached.");
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

  const project = lead.projects?.[0] ?? null;
  const isConverted = lead.status === "converted";

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
        {!isConverted && (
          <button
            onClick={() => setShowConvert(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Convert (Deposit Paid)
          </button>
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

        {/* Internal controls */}
        <Section title="Internal controls">
          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Status</label>
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
            </div>

            {/* Discovery override */}
            <div>
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
            </div>

            {/* Proposed hosting */}
            <div>
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
            </div>

            {/* Proposed maintenance plan */}
            <div>
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
            </div>
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
                        <p className="text-xs text-gray-600 mt-0.5">{fmtDateTime(ev.created_at)}</p>
                      </div>
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
