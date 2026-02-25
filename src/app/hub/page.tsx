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
  project_sp_item_id: string | null;
  project_ref: string | null;
  agreed_budget: number | null;
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

// ─── Accept Modal ─────────────────────────────────────────────────────────────

function AcceptModal({
  row,
  onConfirm,
  onClose,
}: {
  row: Submission;
  onConfirm: (fields: {
    agreedBudget: number;
    depositAmount: number;
    targetDelivery: string;
    projectLead: string;
  }) => void;
  onClose: () => void;
}) {
  const [agreedBudget, setAgreedBudget] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [targetDelivery, setTargetDelivery] = useState("");
  const [projectLead, setProjectLead] = useState("Phil");

  function handleBudgetChange(val: string) {
    setAgreedBudget(val);
    const n = Number(val);
    if (n > 0) setDepositAmount(String(Math.round(n * 0.5)));
    else setDepositAmount("");
  }

  function handleConfirm() {
    const b = Number(agreedBudget);
    if (!b || b <= 0) return;
    const d = Number(depositAmount) || Math.round(b * 0.5);
    onConfirm({ agreedBudget: b, depositAmount: d, targetDelivery, projectLead });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0d0e14] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">
              Accepting project
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {row.contact_name ?? "Client"}
              {row.company_name ? ` · ${row.company_name}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-white/40 block mb-1.5">
              Agreed Budget (€) <span className="text-violet-400">*</span>
            </label>
            <input
              type="number"
              value={agreedBudget}
              onChange={(e) => handleBudgetChange(e.target.value)}
              placeholder="e.g. 8000"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-400/40 transition"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1.5">
              Deposit Amount (€){" "}
              <span className="text-white/25">(defaults to 50%)</span>
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder={
                agreedBudget ? `€${Math.round(Number(agreedBudget) * 0.5)}` : "Amount"
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-400/40 transition"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1.5">Target Delivery</label>
            <input
              type="date"
              value={targetDelivery}
              onChange={(e) => setTargetDelivery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/40 transition"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1.5">Project Lead</label>
            <input
              type="text"
              value={projectLead}
              onChange={(e) => setProjectLead(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/40 transition"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!agreedBudget || Number(agreedBudget) <= 0}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Accept &amp; Create Project
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
  const [acceptPending, setAcceptPending] = useState<{
    row: Submission;
    nextStage: Stage;
  } | null>(null);
  const [promptCopied, setPromptCopied] = useState<string | null>(null);

  // Invoice panel — one open at a time
  const [invoicePanel, setInvoicePanel] = useState<string | null>(null);
  const [invoiceFields, setInvoiceFields] = useState({
    type: "Deposit",
    amount: "",
    notes: "",
  });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

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

  async function advanceStage(
    row: Submission,
    nextStage: Stage,
    extra?: {
      agreedBudget?: number;
      depositAmount?: number;
      targetDelivery?: string;
      projectLead?: string;
    }
  ) {
    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === row.id ? { ...s, stage: nextStage } : s))
    );
    try {
      await fetch("/api/hub/stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, stage: nextStage, ...extra }),
      });
      // Reload to pick up project_ref / agreed_budget written by backend hooks
      if (
        nextStage === "accepted" ||
        nextStage === "deposit_paid" ||
        nextStage === "delivered"
      ) {
        await load();
      }
    } catch {
      await load();
    }
    setStageModal({ stage: nextStage, name: row.contact_name });
  }

  // Intercepts "accepted" to show the AcceptModal first
  function handleAdvanceStage(row: Submission, nextStage: Stage) {
    if (nextStage === "accepted") {
      setAcceptPending({ row, nextStage });
    } else {
      advanceStage(row, nextStage);
    }
  }

  async function copyPrompt(row: Submission) {
    const text = buildAiPrompt(row);
    await navigator.clipboard.writeText(text);
    setPromptCopied(row.id);
    setTimeout(() => setPromptCopied(null), 2000);
  }

  function openInvoicePanel(row: Submission) {
    setInvoicePanel(row.id);
    setInvoiceResult(null);
    setInvoiceFields({
      type: "Deposit",
      amount: row.agreed_budget
        ? String(Math.round(row.agreed_budget * 0.5))
        : "",
      notes: "",
    });
  }

  async function createInvoice(row: Submission) {
    if (!row.project_ref || !invoiceFields.amount) return;
    setInvoiceSubmitting(true);
    setInvoiceResult(null);
    try {
      const res = await fetch("/api/hub/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: row.id,
          internalRef: row.project_ref,
          invoiceType: invoiceFields.type,
          amount: Number(invoiceFields.amount),
          notes: invoiceFields.notes,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setInvoiceResult({
          ok: true,
          message: `✓ ${json.invoiceNumber} created in SharePoint`,
        });
        setInvoiceFields({ type: "Deposit", amount: "", notes: "" });
      } else {
        setInvoiceResult({
          ok: false,
          message: json.error ?? "Failed to create invoice",
        });
      }
    } catch (err) {
      setInvoiceResult({ ok: false, message: String(err) });
    } finally {
      setInvoiceSubmitting(false);
    }
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

      {/* Accept modal */}
      {acceptPending && (
        <AcceptModal
          row={acceptPending.row}
          onConfirm={(fields) => {
            const { row, nextStage } = acceptPending;
            setAcceptPending(null);
            advanceStage(row, nextStage, fields);
          }}
          onClose={() => setAcceptPending(null)}
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Project</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Stage</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-white/50">SharePoint</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {submissions.flatMap((row) => {
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
                    const nextStage =
                      currentIdx < STAGES.length - 1
                        ? STAGES[currentIdx + 1]
                        : null;

                    const mainRow = (
                      <tr
                        key={row.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer"
                        onClick={() => setExpanded(isExpanded ? null : row.id)}
                      >
                        <td className="px-4 py-3 text-white/50 whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white/90">
                            {row.contact_name ?? "—"}
                          </div>
                          <div className="text-xs text-white/40">
                            {row.contact_email ?? ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/70">
                          {row.company_name ?? "—"}
                        </td>
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
                          {row.project_ref ? (
                            <span className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-0.5 text-xs font-mono font-medium text-violet-300">
                              {row.project_ref}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
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
                    );

                    if (!isExpanded) return [mainRow];

                    const detailRow = (
                      <tr
                        key={`${row.id}-detail`}
                        className="bg-white/[0.015] border-b border-white/5"
                      >
                        <td colSpan={9} className="px-6 py-5">
                          {/* Action bar */}
                          <div className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-white/8">
                            {nextStage && (
                              <button
                                onClick={() => handleAdvanceStage(row, nextStage)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white transition"
                              >
                                Advance to {STAGE_LABELS[nextStage]} →
                              </button>
                            )}
                            <button
                              onClick={() => copyPrompt(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/20 transition"
                            >
                              {promptCopied === row.id ? "Copied!" : "Copy AI Prompt"}
                            </button>
                            <select
                              value={row.stage ?? "submitted"}
                              onChange={(e) =>
                                handleAdvanceStage(row, e.target.value as Stage)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/50 outline-none cursor-pointer"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {STAGE_LABELS[s]}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Project card */}
                          {row.project_ref && (
                            <div className="mb-5 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xs font-semibold uppercase tracking-widest text-violet-400/70">
                                    Project
                                  </span>
                                  <span className="font-mono text-sm font-semibold text-violet-200">
                                    {row.project_ref}
                                  </span>
                                </div>
                                <a
                                  href="https://otwoone.sharepoint.com"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-white/30 hover:text-white/60 transition"
                                >
                                  Open in SharePoint →
                                </a>
                              </div>

                              <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                                <div>
                                  <div className="text-white/40 mb-0.5">Agreed Budget</div>
                                  <div className="text-white/80 font-medium">
                                    {row.agreed_budget
                                      ? `€${row.agreed_budget.toLocaleString()}`
                                      : "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-white/40 mb-0.5">Deposit</div>
                                  <div className="text-white/80 font-medium">
                                    {row.agreed_budget
                                      ? `€${Math.round(
                                          row.agreed_budget * 0.5
                                        ).toLocaleString()}`
                                      : "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-white/40 mb-0.5">Stage</div>
                                  <StageBadge stage={row.stage} />
                                </div>
                              </div>

                              {/* Invoice creation */}
                              <div className="border-t border-white/8 pt-3">
                                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
                                  Invoices
                                </p>
                                {invoicePanel === row.id ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      <select
                                        value={invoiceFields.type}
                                        onChange={(e) =>
                                          setInvoiceFields((f) => ({
                                            ...f,
                                            type: e.target.value,
                                          }))
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white/70 outline-none"
                                      >
                                        <option value="Deposit">Deposit</option>
                                        <option value="Milestone">Milestone</option>
                                        <option value="Final">Final</option>
                                      </select>
                                      <input
                                        type="number"
                                        value={invoiceFields.amount}
                                        onChange={(e) =>
                                          setInvoiceFields((f) => ({
                                            ...f,
                                            amount: e.target.value,
                                          }))
                                        }
                                        placeholder={
                                          row.agreed_budget
                                            ? `€${Math.round(row.agreed_budget * 0.5)}`
                                            : "Amount (€)"
                                        }
                                        className="w-32 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white/70 placeholder-white/20 outline-none"
                                      />
                                      <input
                                        type="text"
                                        value={invoiceFields.notes}
                                        onChange={(e) =>
                                          setInvoiceFields((f) => ({
                                            ...f,
                                            notes: e.target.value,
                                          }))
                                        }
                                        placeholder="Notes (optional)"
                                        className="flex-1 min-w-28 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white/70 placeholder-white/20 outline-none"
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          createInvoice(row);
                                        }}
                                        disabled={
                                          invoiceSubmitting || !invoiceFields.amount
                                        }
                                        className="rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                      >
                                        {invoiceSubmitting ? "Creating…" : "Create →"}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setInvoicePanel(null);
                                          setInvoiceResult(null);
                                        }}
                                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 transition"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    {invoiceResult && (
                                      <p
                                        className={`text-xs ${
                                          invoiceResult.ok
                                            ? "text-emerald-400"
                                            : "text-red-400"
                                        }`}
                                      >
                                        {invoiceResult.message}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openInvoicePanel(row);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/20 transition"
                                  >
                                    + New invoice
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

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
                    );

                    return [mainRow, detailRow];
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
