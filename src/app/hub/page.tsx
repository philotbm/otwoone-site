"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Submission = {
  id: string;
  created_at: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  company_name: string | null;
  answers: Record<string, any> | null;
  sharepoint_item_id: string | null;
  sharepoint_synced_at: string | null;
  sharepoint_sync_error: string | null;
};

type SyncState = "idle" | "syncing" | "done" | "error";

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HubPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

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
        // Refresh list to show updated sync status
        await load();
      } else {
        setSyncStates((s) => ({ ...s, [id]: "error" }));
      }
    } catch {
      setSyncStates((s) => ({ ...s, [id]: "error" }));
    }
  }

  const unsynced = submissions.filter((s) => !s.sharepoint_synced_at).length;
  const synced = submissions.filter((s) => s.sharepoint_synced_at).length;

  return (
    <div className="min-h-screen bg-[#05060a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
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

      <div className="mx-auto max-w-6xl px-6 py-8">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Services</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/50">Quote</th>
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
                          <td colSpan={7} className="px-6 py-4">
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
        )}
      </div>
    </div>
  );
}
