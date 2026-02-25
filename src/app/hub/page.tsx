"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage =
  | "submitted"
  | "quoted"
  | "scoping_call"
  | "accepted"
  | "deposit_paid"
  | "in_build"
  | "delivered";

type Submission = {
  id: string;
  created_at: string;
  status: string;
  stage: Stage | null;
  contact_name: string | null;
  contact_email: string | null;
  company_name: string | null;
  answers: Record<string, any> | null;
  sharepoint_item_id: string | null;
  sharepoint_synced_at: string | null;
  sharepoint_sync_error: string | null;
};

type SyncState = "idle" | "syncing" | "done" | "error";

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: Stage[] = [
  "submitted",
  "quoted",
  "scoping_call",
  "accepted",
  "deposit_paid",
  "in_build",
  "delivered",
];

const STAGE_LABELS: Record<Stage, string> = {
  submitted:    "Submitted",
  quoted:       "Quoted",
  scoping_call: "Scoping Call",
  accepted:     "Accepted",
  deposit_paid: "Deposit Paid",
  in_build:     "In Build",
  delivered:    "Delivered",
};

const STAGE_COLORS: Record<Stage, string> = {
  submitted:    "bg-slate-500/20 text-slate-300 border-slate-400/20",
  quoted:       "bg-blue-500/20 text-blue-300 border-blue-400/20",
  scoping_call: "bg-indigo-500/20 text-indigo-300 border-indigo-400/20",
  accepted:     "bg-violet-500/20 text-violet-300 border-violet-400/20",
  deposit_paid: "bg-amber-500/20 text-amber-300 border-amber-400/20",
  in_build:     "bg-emerald-500/20 text-emerald-300 border-emerald-400/20",
  delivered:    "bg-green-500/20 text-green-300 border-green-400/20",
};

// ─── Email templates ──────────────────────────────────────────────────────────

function getEmailTemplate(stage: Stage, name: string): { subject: string; body: string } {
  const hi = name ? `Hi ${name.split(" ")[0]},` : "Hi,";
  switch (stage) {
    case "quoted":
      return {
        subject: "Your OTwoOne brief — our initial thoughts",
        body: `${hi}

Thanks for submitting your brief. We've reviewed your details and we'd like to come back to you with a scope and quote.

Based on what you've shared, we're recommending we start with a Discovery session — a fixed-price planning engagement where we map exactly what needs to be built, agree the deliverables, and give you a firm price before any build work begins.

We'd like to arrange a short call to walk you through our thinking. Are you free for 30 minutes this week or next?

You can reply to this email or book a time at [calendar link].

Looking forward to speaking,
OTwoOne`,
      };
    case "scoping_call":
      return {
        subject: "OTwoOne — scoping call follow-up",
        body: `${hi}

Great to speak with you. As discussed, here's a summary of what we covered and the agreed next steps:

[Insert scope summary]

Please let us know if anything above needs clarifying. Once you're happy, we'll issue a formal proposal for your sign-off.

OTwoOne`,
      };
    case "accepted":
      return {
        subject: "OTwoOne — proposal accepted · next steps",
        body: `${hi}

Thank you for accepting the proposal. We're looking forward to working with you.

To confirm the engagement and get started, we require a [X]% deposit. You'll receive a separate invoice for this shortly.

Once the deposit is received, we'll confirm your project start date and share the project plan.

OTwoOne`,
      };
    case "deposit_paid":
      return {
        subject: "OTwoOne — deposit received · project kick-off",
        body: `${hi}

We've received your deposit — thank you. Your project is now confirmed.

Start date: [date]
First milestone: [milestone]
Your main point of contact: [name]

We'll be in touch shortly to schedule the kick-off session.

OTwoOne`,
      };
    case "in_build":
      return {
        subject: "OTwoOne — build underway",
        body: `${hi}

We're now in build. Here's where things stand:

Current milestone: [milestone]
Next review / demo: [date]
Progress tracker: [link if applicable]

We'll send you a progress update at each milestone. If anything comes up in the meantime, reply to this email.

OTwoOne`,
      };
    case "delivered":
      return {
        subject: "OTwoOne — delivery & sign-off",
        body: `${hi}

We're pleased to confirm that [project name] has been delivered.

All agreed deliverables have been completed. Please review the delivery and confirm your sign-off by replying to this email.

Once signed off, we'll issue the final invoice and transfer all assets, access, and documentation.

OTwoOne`,
      };
    default:
      return { subject: "", body: "" };
  }
}

// ─── AI prompt builder ────────────────────────────────────────────────────────

function buildAiPrompt(row: Submission): string {
  const a = row.answers ?? {};
  const pillars: string[] = Array.isArray(a.pillars) ? a.pillars : [];
  const lines: string[] = [
    "PROJECT BRIEF — OTwoOne Intake",
    "================================",
    `Received: ${formatDate(row.created_at)}`,
    `Client:   ${row.contact_name ?? "Unknown"} <${row.contact_email ?? ""}>`,
    `Company:  ${row.company_name ?? "—"} · ${a.company_website ?? ""}`,
    "",
    `PILLARS: ${pillars.join(" + ") || "—"}`,
    `PRIMARY: ${a.primary_pillar ?? "—"}`,
  ];

  if (a.studio) {
    lines.push("", "STUDIO");
    if (a.studio.what)     lines.push(`  What: ${a.studio.what}`);
    if (a.studio.eng_type) lines.push(`  Engagement: ${a.studio.eng_type}`);
    if (a.studio.codebase) lines.push(`  Codebase: ${a.studio.codebase}`);
  }

  if (a.consultancy) {
    lines.push("", "CONSULTANCY");
    if (a.consultancy.support)   lines.push(`  Support type: ${a.consultancy.support}`);
    if (a.consultancy.cadence)   lines.push(`  Frequency:    ${a.consultancy.cadence}`);
    if (a.consultancy.team_size) lines.push(`  Team size:    ${a.consultancy.team_size}`);
  }

  if (a.branding) {
    lines.push("", "BRANDING");
    if (a.branding.need)     lines.push(`  Need:     ${a.branding.need}`);
    if (a.branding.existing) lines.push(`  Existing: ${a.branding.existing}`);
    if (a.branding.output)   lines.push(`  Output:   ${a.branding.output}`);
  }

  lines.push(
    "",
    `BUDGET:   ${a.budget ?? "Not provided"}`,
    `TIMING:   ${a.timing ?? "Not provided"}`,
    `CONTEXT:  ${a.extra ?? "Not provided"}`,
    "================================",
    "Review this project brief for OTwoOne (Cork-based studio).",
    "Draft a Discovery Sprint proposal to send to the client that includes:",
    "- What we understand they need",
    "- What the Discovery Sprint will cover (2 weeks, fixed price)",
    "- What they'll receive at the end (plan, backlog, fixed quote)",
    "- Recommended next steps",
    "Keep the tone plain, professional, and free of technical jargon."
  );

  return lines.join("\n");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function SyncBadge({
  item,
}: {
  item: Pick<Submission, "sharepoint_item_id" | "sharepoint_synced_at" | "sharepoint_sync_error">;
}) {
  if (item.sharepoint_synced_at && item.sharepoint_item_id) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 px-2.5 py-0.5 text-xs text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Synced
      </span>
    );
  }
  if (item.sharepoint_sync_error) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-400/20 px-2.5 py-0.5 text-xs text-red-300 cursor-help"
        title={item.sharepoint_sync_error}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs text-white/40">
      <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
      Pending
    </span>
  );
}

function StageBadge({ stage }: { stage: Stage | null }) {
  const s = stage ?? "submitted";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[s]}`}
    >
      {STAGE_LABELS[s]}
    </span>
  );
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({
  stage,
  name,
  onClose,
}: {
  stage: Stage;
  name: string | null;
  onClose: () => void;
}) {
  const { subject, body } = getEmailTemplate(stage, name ?? "");
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    const text = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0d0e14] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">
              Stage: {STAGE_LABELS[stage]}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">Email template</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="mb-3">
            <p className="text-xs text-white/40 mb-1">Subject</p>
            <p className="text-sm text-white/90 font-medium">{subject}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-1">Body</p>
            <pre className="rounded-xl border border-white/8 bg-black/30 p-4 text-xs text-white/70 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {body}
            </pre>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50 hover:text-white transition"
          >
            Close
          </button>
          <button
            onClick={copyEmail}
            className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90 transition"
          >
            {copied ? "Copied!" : "Copy email"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HubPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stageModal, setStageModal] = useState<{ stage: Stage; name: string | null } | null>(null);
  const [promptCopied, setPromptCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hub/submissions?limit=50");
      const json = await res.json();
      setSubmissions(json.data ?? []);
      setCount(json.count ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function syncOne(id: string) {
    setSyncStates((s) => ({ ...s, [id]: "syncing" }));
    try {
      const res = await fetch("/api/hub/sp-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSyncStates((s) => ({ ...s, [id]: "done" }));
        await load();
      } else {
        setSyncStates((s) => ({ ...s, [id]: "error" }));
      }
    } catch {
      setSyncStates((s) => ({ ...s, [id]: "error" }));
    }
  }

  async function advanceStage(row: Submission, nextStage: Stage) {
    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === row.id ? { ...s, stage: nextStage } : s))
    );
    try {
      await fetch("/api/hub/stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, stage: nextStage }),
      });
    } catch {
      // Revert on error
      await load();
    }
    // Show email template modal
    setStageModal({ stage: nextStage, name: row.contact_name });
  }

  async function copyPrompt(row: Submission) {
    const text = buildAiPrompt(row);
    await navigator.clipboard.writeText(text);
    setPromptCopied(row.id);
    setTimeout(() => setPromptCopied(null), 2000);
  }

  const unsynced = submissions.filter((s) => !s.sharepoint_synced_at).length;
  const synced = submissions.filter((s) => s.sharepoint_synced_at).length;

  return (
    <div className="min-h-screen bg-[#05060a] text-white">
      {/* Email template modal */}
      {stageModal && (
        <EmailModal
          stage={stageModal.stage}
          name={stageModal.name}
          onClose={() => setStageModal(null)}
        />
      )}

      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/branding/otwoone-logo.png"
              alt="OTwoOne"
              className="h-8 w-auto opacity-90"
            />
            <span className="text-white/30">·</span>
            <span className="text-sm font-medium text-white/70">Hub</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>{count} total</span>
            <span className="text-emerald-400">{synced} synced</span>
            {unsynced > 0 && (
              <span className="text-amber-400">{unsynced} pending</span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Section title */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">Elevate Submissions</h1>
          <button
            onClick={load}
            className="text-xs text-white/40 hover:text-white/70 transition"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-sm text-white/40 py-12 text-center">Loading…</div>
        ) : submissions.length === 0 ? (
          <div className="text-sm text-white/40 py-12 text-center">
            No submissions yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Services</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Quote</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Stage</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">SharePoint</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((row) => {
                    const computed = row.answers?.computed ?? {};
                    const quote = computed.quote ?? {};
                    const services = Array.isArray(row.answers?.services)
                      ? row.answers.services.join(", ")
                      : row.answers?.need_help ?? "—";
                    const syncState = syncStates[row.id] ?? "idle";
                    const isSyncing = syncState === "syncing";
                    const isExpanded = expanded === row.id;
                    const currentStage = row.stage ?? "submitted";
                    const currentIdx = STAGES.indexOf(currentStage as Stage);
                    const nextStage = currentIdx < STAGES.length - 1
                      ? STAGES[currentIdx + 1]
                      : null;

                    return (
                      <>
                        <tr
                          key={row.id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer"
                          onClick={() => setExpanded(isExpanded ? null : row.id)}
                        >
                          <td className="px-4 py-3 text-white/50 whitespace-nowrap">
                            {formatDate(row.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white/90">{row.contact_name ?? "—"}</div>
                            <div className="text-xs text-white/40">{row.contact_email ?? ""}</div>
                          </td>
                          <td className="px-4 py-3 text-white/70">{row.company_name ?? "—"}</td>
                          <td className="px-4 py-3 text-white/60 text-xs">{services}</td>
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                            {quote.low != null
                              ? `€${quote.low}–€${quote.high}`
                              : "—"}
                            {quote.confidence && (
                              <span className="ml-1.5 text-xs text-white/35">
                                ({quote.confidence})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StageBadge stage={row.stage} />
                          </td>
                          <td className="px-4 py-3">
                            <SyncBadge item={row} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                syncOne(row.id);
                              }}
                              disabled={isSyncing || !!row.sharepoint_synced_at}
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                              {isSyncing
                                ? "Syncing…"
                                : row.sharepoint_synced_at
                                ? "Synced ✓"
                                : "Sync →"}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable detail row */}
                        {isExpanded && (
                          <tr key={`${row.id}-detail`} className="bg-white/[0.015] border-b border-white/5">
                            <td colSpan={8} className="px-6 py-5">

                              {/* Action bar */}
                              <div className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-white/8">
                                {/* Advance stage */}
                                {nextStage && (
                                  <button
                                    onClick={() => advanceStage(row, nextStage)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white transition"
                                  >
                                    Advance to {STAGE_LABELS[nextStage]} →
                                  </button>
                                )}
                                {/* Copy AI prompt */}
                                <button
                                  onClick={() => copyPrompt(row)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/20 transition"
                                >
                                  {promptCopied === row.id ? "Copied!" : "Copy AI Prompt"}
                                </button>
                                {/* Stage override dropdown */}
                                <select
                                  value={row.stage ?? "submitted"}
                                  onChange={(e) => advanceStage(row, e.target.value as Stage)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/50 outline-none cursor-pointer"
                                >
                                  {STAGES.map((s) => (
                                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Detail fields */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                {row.answers &&
                                  Object.entries(row.answers)
                                    .filter(([k]) => k !== "computed")
                                    .map(([k, v]) => {
                                      if (v === null || v === undefined) return null;
                                      const val =
                                        typeof v === "string"
                                          ? v
                                          : JSON.stringify(v, null, 2);
                                      if (!val.trim()) return null;
                                      return (
                                        <div key={k}>
                                          <div className="text-white/40 mb-0.5 capitalize">
                                            {k.replace(/_/g, " ")}
                                          </div>
                                          <div className="text-white/80 whitespace-pre-wrap break-words">
                                            {val}
                                          </div>
                                        </div>
                                      );
                                    })}
                                {row.sharepoint_item_id && (
                                  <div>
                                    <div className="text-white/40 mb-0.5">SP Item ID</div>
                                    <div className="text-white/50 font-mono">
                                      {row.sharepoint_item_id}
                                    </div>
                                  </div>
                                )}
                                {row.sharepoint_sync_error && (
                                  <div className="col-span-2 md:col-span-3">
                                    <div className="text-red-400/70 mb-0.5">Sync error</div>
                                    <div className="text-red-300/80 font-mono text-xs">
                                      {row.sharepoint_sync_error}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
