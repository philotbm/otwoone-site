"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepResult = {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
  error?: string;
};

type SmokeResult = {
  ok: boolean;
  steps: StepResult[];
  created?: {
    leads:    Array<{ scenario: string; id: string; company_name: string }>;
    projects: Array<{ id: string; lead_id: string }>;
  };
  error?: string;
};

type CleanupResult = {
  deleted?: { leads: number; projects: number };
  note?: string;
  error?: string;
};

type UIState = "idle" | "running" | "done" | "cleaning" | "cleaned";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ─── Components ───────────────────────────────────────────────────────────────

function StepRow({ step, index }: { step: StepResult; index: number }) {
  const [open, setOpen] = useState(false);
  const hasExtra = step.error || (step.details && Object.keys(step.details).length > 0);

  return (
    <div className={cx(
      "border-b border-white/[0.04] last:border-b-0",
      !step.ok && "bg-red-500/[0.03]"
    )}>
      <button
        type="button"
        onClick={() => hasExtra && setOpen((o) => !o)}
        className={cx(
          "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors",
          hasExtra && "hover:bg-white/[0.02]",
          !hasExtra && "cursor-default"
        )}
      >
        {/* Step number */}
        <span className="text-xs text-gray-600 w-5 shrink-0 text-right">{index + 1}</span>

        {/* Status icon */}
        <span className={cx(
          "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
          step.ok
            ? "bg-green-500/20 text-green-400"
            : "bg-red-500/20 text-red-400"
        )}>
          {step.ok ? "✓" : "✗"}
        </span>

        {/* Name */}
        <span className={cx(
          "flex-1 text-sm",
          step.ok ? "text-gray-200" : "text-red-300"
        )}>
          {step.name}
        </span>

        {/* Error preview */}
        {!step.ok && step.error && (
          <span className="text-xs text-red-400/80 max-w-xs truncate">{step.error}</span>
        )}

        {/* Expand chevron */}
        {hasExtra && (
          <span className={cx(
            "text-gray-600 text-xs transition-transform",
            open && "rotate-180"
          )}>▾</span>
        )}
      </button>

      {/* Expanded detail */}
      {open && hasExtra && (
        <div className="px-5 pb-4 pl-[52px]">
          {step.error && (
            <p className="text-xs text-red-400 mb-2 font-mono">{step.error}</p>
          )}
          {step.details && Object.keys(step.details).length > 0 && (
            <pre className="text-xs text-gray-500 font-mono bg-white/[0.02] rounded p-3 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(step.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryBar({ result }: { result: SmokeResult }) {
  const total  = result.steps.length;
  const passed = result.steps.filter((s) => s.ok).length;
  const failed = total - passed;

  return (
    <div className={cx(
      "flex items-center gap-4 px-5 py-3 rounded-xl border text-sm",
      result.ok
        ? "bg-green-500/10 border-green-500/20 text-green-300"
        : "bg-red-500/10 border-red-500/20 text-red-300"
    )}>
      <span className="text-lg">{result.ok ? "✅" : "❌"}</span>
      <span className="font-medium">{result.ok ? "All steps passed" : `${failed} step${failed !== 1 ? "s" : ""} failed`}</span>
      <span className="text-xs opacity-60 ml-auto">{passed}/{total} passed</span>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SmokePage() {
  const [uiState, setUiState]       = useState<UIState>("idle");
  const [result, setResult]         = useState<SmokeResult | null>(null);
  const [cleanup, setCleanup]       = useState<CleanupResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Run full smoke test ────────────────────────────────────────────────────

  async function handleRunSmoke() {
    setUiState("running");
    setResult(null);
    setCleanup(null);
    setFetchError(null);

    try {
      const res = await fetch("/api/hub/smoke/run", { method: "POST" });
      const json: SmokeResult = await res.json();
      setResult(json);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUiState("done");
    }
  }

  // ── Clean up smoke data ───────────────────────────────────────────────────

  async function handleCleanup() {
    setUiState("cleaning");
    setFetchError(null);

    try {
      const res = await fetch("/api/hub/smoke/cleanup", { method: "POST" });
      const json: CleanupResult = await res.json();
      setCleanup(json);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUiState("cleaned");
    }
  }

  const isRunning  = uiState === "running";
  const isCleaning = uiState === "cleaning";

  return (
    <div className="min-h-screen bg-[#05060a] text-gray-200">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center gap-4">
        <Link href="/hub" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Hub
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-white">Smoke Test</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            End-to-end check · Elevate → Lead → Hub → Convert → Project → Delivered → Maintenance
          </p>
        </div>
      </header>

      <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">

        {/* Controls */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-4">Actions</p>
          <div className="flex flex-wrap gap-3">

            {/* Run */}
            <button
              type="button"
              onClick={handleRunSmoke}
              disabled={isRunning || isCleaning}
              className={cx(
                "px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                !isRunning && !isCleaning
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                  : "bg-white/5 text-gray-600 cursor-not-allowed"
              )}
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Running…
                </span>
              ) : "Run Full Smoke Test"}
            </button>

            {/* Cleanup */}
            <button
              type="button"
              onClick={handleCleanup}
              disabled={isRunning || isCleaning}
              className={cx(
                "px-4 py-2.5 rounded-lg text-sm font-medium border transition-all",
                !isRunning && !isCleaning
                  ? "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                  : "border-white/5 text-gray-600 cursor-not-allowed"
              )}
            >
              {isCleaning ? "Cleaning…" : "Clean Up Smoke Leads"}
            </button>

          </div>

          {/* Scenario legend */}
          <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {[
              { key: "A", label: "Build new",        sub: "€15k–€40k · clear" },
              { key: "B", label: "Improve existing", sub: "Under €3k · short def" },
              { key: "C", label: "Branding",          sub: "€3k–€5k · low alignment" },
              { key: "D", label: "Tech advice",       sub: "Vague · low clarity" },
            ].map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/5 text-gray-400 font-medium shrink-0">{s.key}</span>
                <span>{s.label} · <span className="text-gray-600">{s.sub}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Fetch error */}
        {fetchError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {fetchError}
          </div>
        )}

        {/* Cleanup result */}
        {cleanup && (
          <div className={cx(
            "px-4 py-3 rounded-xl border text-sm",
            cleanup.error
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-green-500/10 border-green-500/20 text-green-300"
          )}>
            {cleanup.error
              ? `Cleanup error: ${cleanup.error}`
              : cleanup.note
                ? cleanup.note
                : `Deleted ${cleanup.deleted?.leads ?? 0} lead(s) and ${cleanup.deleted?.projects ?? 0} project(s)`
            }
          </div>
        )}

        {/* Smoke results */}
        {result && (
          <div className="space-y-4">
            <SummaryBar result={result} />

            {/* Created IDs */}
            {result.created && (result.created.leads.length > 0 || result.created.projects.length > 0) && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-3">Created this run</p>
                <div className="space-y-1">
                  {result.created.leads.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">Lead {l.scenario}</span>
                      <span className="font-mono text-gray-400">{l.id.slice(0, 12)}…</span>
                      <Link
                        href={`/hub/leads/${l.id}`}
                        className="text-indigo-400 hover:text-indigo-300 ml-auto"
                      >
                        View →
                      </Link>
                    </div>
                  ))}
                  {result.created.projects.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">Project</span>
                      <span className="font-mono text-gray-400">{p.id.slice(0, 12)}…</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps list */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <p className="text-xs font-medium tracking-widest uppercase text-gray-500">Steps</p>
              </div>
              {result.steps.map((step, i) => (
                <StepRow key={i} step={step} index={i} />
              ))}
            </div>

            {/* Raw JSON (collapsible) */}
            <details className="group">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                Raw JSON response
              </summary>
              <pre className="mt-2 text-xs text-gray-500 font-mono bg-white/[0.02] border border-white/5 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Idle hint */}
        {uiState === "idle" && (
          <p className="text-sm text-gray-600 text-center py-8">
            Click <span className="text-gray-400">Run Full Smoke Test</span> to begin.
          </p>
        )}
      </div>
    </div>
  );
}
