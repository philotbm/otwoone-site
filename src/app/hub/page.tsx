"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { OTWOONE_OS_VERSION } from "@/lib/osVersion";

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

type ProjectIntakeData = {
  step1: Record<string, unknown> | null;
  step2: Record<string, unknown> | null;
  completed_at: string | null;
};

type ProjectData = {
  id: string;
  intake_status: string | null;
  intake_last_saved_at: string | null;
  project_intakes: ProjectIntakeData[] | null;
};

type Lead = {
  id: string;
  created_at: string;
  updated_at: string | null;   // set by DB trigger; null only on very old rows pre-migration
  status: LeadStatus;
  contact_name: string | null;
  contact_email: string;
  company_name: string | null;
  engagement_type: string | null;
  budget: string | null;
  discovery_depth: string | null;
  discovery_depth_suggested: string | null;
  total_score: number | null;
  lead_details: { success_definition: string | null; internal_notes: string | null } | null;
  projects: ProjectData[] | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/** Relative time from a timestamp to now — e.g. "2d ago", "3h ago", or absolute date if >7d. */
function relTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return fmt(dateStr);
}

/** ISO timestamp formatted for tooltip display. */
function isoFmt(dateStr: string | null): string {
  if (!dateStr) return "unknown";
  return new Date(dateStr).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

const ENGAGEMENT_LABELS: Record<string, string> = {
  build_new:       "Build new",
  improve_existing:"Improve existing",
  tech_advice:     "Tech advice",
  branding:        "Branding",
  ongoing_support: "Ongoing support",
};

const BUDGET_LABELS: Record<string, string> = {
  under_3k:  "Under €3k",
  "3k_5k":   "€3k–€5k",
  "5k_15k":  "€5k–€15k",
  "15k_40k": "€15k–€40k",
  "40k_plus":"€40k+",
  not_sure:  "Not sure",
};

const STATUS_META: Record<LeadStatus, { label: string; colour: string }> = {
  lead_submitted:    { label: "Enquiry",    colour: "text-blue-400 bg-blue-400/10" },
  scoping_sent:      { label: "Scoping",    colour: "text-cyan-400 bg-cyan-400/10" },
  scope_received:    { label: "Scoped",     colour: "text-indigo-400 bg-indigo-400/10" },
  proposal_sent:     { label: "Proposal",   colour: "text-purple-400 bg-purple-400/10" },
  deposit_requested: { label: "Dep. Req.",  colour: "text-orange-400 bg-orange-400/10" },
  deposit_received:  { label: "Dep. Rcvd", colour: "text-emerald-400 bg-emerald-400/10" },
  lost_pre_deposit:  { label: "Lost",       colour: "text-red-400 bg-red-400/10" },
  converted:         { label: "Converted",  colour: "text-green-400 bg-green-400/10" },
};

const LEAD_STATUSES: LeadStatus[] = [
  "lead_submitted", "scoping_sent", "scope_received", "proposal_sent",
  "deposit_requested", "deposit_received", "lost_pre_deposit", "converted",
];

// ─── Staleness ─────────────────────────────────────────────────────────────────
// Shows a "Xd no action" tag for active leads that haven't been touched.
// Uses updated_at (set by DB trigger on every row UPDATE).
// Falls back to created_at only if updated_at is null (pre-migration rows).
// Terminal statuses (lost, converted) are never stale.

const STALE_DAYS: Partial<Record<LeadStatus, number>> = {
  lead_submitted:    3,
  scoping_sent:      3,
  scope_received:    5,
  proposal_sent:     7,
  deposit_requested: 7,
  deposit_received:  2,   // should convert quickly
  lost_pre_deposit:  14,
  converted:         30,
};

type StalenessInfo = { days: number; level: "warn" | "overdue" };

function stalenessInfo(lead: Lead): StalenessInfo | null {
  const threshold = STALE_DAYS[lead.status];
  if (threshold == null) return null;
  // Use updated_at (real last-touch time); fall back to created_at if null
  const activityTs = lead.updated_at ?? lead.created_at;
  const days = Math.floor((Date.now() - new Date(activityTs).getTime()) / 86_400_000);
  if (days < threshold) return null;
  return { days, level: days >= threshold * 2 ? "overdue" : "warn" };
}

function StalenessTag({ info }: { info: StalenessInfo }) {
  return (
    <span
      title={`${info.days} days since last activity with no status change`}
      className={cx(
        "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm mt-1 cursor-default",
        info.level === "overdue"
          ? "bg-red-500/15 text-red-400"
          : "bg-amber-500/15 text-amber-400"
      )}
    >
      {info.days}d no action
    </span>
  );
}

// ─── Intake progress chip ──────────────────────────────────────────────────────

type IntakeStep = "none" | "not_started" | "step2" | "step3" | "complete";

function deriveIntakeStep(projects: ProjectData[] | null): {
  step: IntakeStep;
  lastSaved: string | null;
} {
  const project = projects?.[0] ?? null;
  if (!project) return { step: "none", lastSaved: null };

  const intake   = project.project_intakes?.[0] ?? null;
  const lastSaved = project.intake_last_saved_at ?? null;

  if (intake?.completed_at) return { step: "complete", lastSaved };
  if (intake?.step2)        return { step: "step3",    lastSaved };
  if (intake?.step1)        return { step: "step2",    lastSaved };
  return { step: "not_started", lastSaved };
}

const INTAKE_CHIP_META: Record<Exclude<IntakeStep, "none">, { label: string; colour: string }> = {
  not_started: { label: "Not started", colour: "text-gray-400 bg-gray-400/10" },
  step2:       { label: "Step 2 of 3", colour: "text-amber-400 bg-amber-400/10" },
  step3:       { label: "Step 3 of 3", colour: "text-indigo-400 bg-indigo-400/10" },
  complete:    { label: "Complete",    colour: "text-green-400 bg-green-400/10" },
};

function IntakeChip({ projects }: { projects: ProjectData[] | null }) {
  const { step, lastSaved } = deriveIntakeStep(projects);
  if (step === "none") return <span className="text-gray-600 text-xs">—</span>;

  const meta = INTAKE_CHIP_META[step];
  return (
    <div>
      <span className={cx("inline-block px-2 py-0.5 rounded text-xs font-medium", meta.colour)}>
        {meta.label}
      </span>
      {lastSaved && step !== "not_started" && (
        <div
          className="text-[10px] text-gray-600 mt-0.5 cursor-default"
          title={isoFmt(lastSaved)}
        >
          {relTime(lastSaved)}
        </div>
      )}
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status] ?? { label: status, colour: "text-gray-400 bg-gray-400/10" };
  return (
    <span className={cx("inline-block px-2 py-0.5 rounded text-xs font-medium", meta.colour)}>
      {meta.label}
    </span>
  );
}

// ─── Score display ─────────────────────────────────────────────────────────────

function ScorePip({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-600">—</span>;
  const colour =
    score >= 4 ? "text-green-400" :
    score >= 3 ? "text-yellow-400" :
    "text-red-400";
  return <span className={cx("font-mono text-sm font-semibold", colour)}>{score.toFixed(1)}</span>;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function HubPage() {
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [counts, setCounts]   = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null); // lead id currently saving

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hub/leads?limit=100");
      const json = await res.json();
      const data: Lead[] = json.data ?? [];
      setLeads(data);

      // Compute counts
      const c: Record<string, number> = {};
      for (const l of data) {
        c[l.status] = (c[l.status] ?? 0) + 1;
      }
      setCounts(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Inline status update ─────────────────────────────────────────────────────

  async function updateStatus(leadId: string, newStatus: LeadStatus) {
    setSaving(leadId);
    try {
      await fetch(`/api/hub/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setLeads((prev) =>
        prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l)
      );
      setCounts((prev) => {
        const next = { ...prev };
        const old = leads.find((l) => l.id === leadId);
        if (old) {
          next[old.status] = Math.max(0, (next[old.status] ?? 1) - 1);
          next[newStatus]  = (next[newStatus] ?? 0) + 1;
        }
        return next;
      });
    } finally {
      setSaving(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#05060a] text-gray-200">

      {/* Top bar */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-indigo-400">OTwoOne</p>
          <h1 className="text-lg font-semibold text-white">Hub</h1>
        </div>
        <button
          onClick={fetchLeads}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Refresh
        </button>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
          {(["lead_submitted","scoping_sent","scope_received","proposal_sent","deposit_requested","deposit_received","lost_pre_deposit","converted"] as LeadStatus[]).map((s) => (
            <div key={s} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
              <p className="text-2xl font-semibold text-white">{counts[s] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">{STATUS_META[s].label}</p>
            </div>
          ))}
        </div>

        {/* Leads table */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Leads</h2>
            <div className="flex items-center gap-3">
              {(() => {
                const staleCount = leads.filter((l) => stalenessInfo(l) !== null).length;
                return staleCount > 0 ? (
                  <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                    {staleCount} stale
                  </span>
                ) : null;
              })()}
              <span className="text-xs text-gray-500">{leads.length} total</span>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-gray-600">Loading…</div>
          ) : leads.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-600">No leads yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Last activity</th>
                    <th className="px-4 py-3 text-left font-medium">Company / Contact</th>
                    <th className="px-4 py-3 text-left font-medium">Engagement</th>
                    <th className="px-4 py-3 text-left font-medium">Budget</th>
                    <th className="px-4 py-3 text-left font-medium">Score</th>
                    <th className="px-4 py-3 text-left font-medium">Discovery</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Intake</th>
                    <th className="px-4 py-3 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {leads.map((lead) => {
                    const stale = stalenessInfo(lead);
                    return (
                    <tr
                      key={lead.id}
                      className={cx(
                        "transition-colors",
                        stale?.level === "overdue" ? "bg-red-500/[0.03] hover:bg-red-500/[0.05]" :
                        stale?.level === "warn"    ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.05]" :
                        "hover:bg-white/[0.02]"
                      )}
                    >

                      {/* Date + staleness */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-gray-400 text-xs">{fmt(lead.created_at)}</span>
                        {stale && (
                          <div><StalenessTag info={stale} /></div>
                        )}
                      </td>

                      {/* Last activity */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="text-gray-500 text-xs cursor-default"
                          title={isoFmt(lead.updated_at ?? lead.created_at)}
                        >
                          {relTime(lead.updated_at ?? lead.created_at)}
                        </span>
                      </td>

                      {/* Company / Contact */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-200 text-sm">
                          {lead.company_name || lead.contact_name || "—"}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{lead.contact_email}</div>
                      </td>

                      {/* Engagement */}
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {ENGAGEMENT_LABELS[lead.engagement_type ?? ""] ?? lead.engagement_type ?? "—"}
                      </td>

                      {/* Budget */}
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {BUDGET_LABELS[lead.budget ?? ""] ?? lead.budget ?? "—"}
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        <ScorePip score={lead.total_score} />
                      </td>

                      {/* Discovery */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {lead.discovery_depth ? (
                          <span className="text-indigo-400 font-medium uppercase tracking-wide">
                            {lead.discovery_depth}
                          </span>
                        ) : lead.discovery_depth_suggested ? (
                          <span className="text-gray-500 uppercase tracking-wide">
                            {lead.discovery_depth_suggested}
                          </span>
                        ) : "—"}
                      </td>

                      {/* Status dropdown */}
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          disabled={saving === lead.id}
                          onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                          className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Intake */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <IntakeChip projects={lead.projects ?? null} />
                      </td>

                      {/* View */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/hub/leads/${lead.id}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <footer className="px-6 py-4 text-center">
        <p className="text-[11px] text-gray-600">OTwoOne OS {OTWOONE_OS_VERSION}</p>
      </footer>
    </div>
  );
}
