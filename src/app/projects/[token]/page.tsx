"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type BasicsForm = {
  contact_name: string;
  project_name: string;
  goals: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ─── Env vars ─────────────────────────────────────────────────────────────────
//
// NEXT_PUBLIC_BOOKINGS_URL — Microsoft Bookings page URL.
// Set in .env.local and in Vercel Environment Variables (all scopes).
//
// Per-project-type variant pattern (future):
//   NEXT_PUBLIC_BOOKINGS_URL_LAUNCH | _FOUNDATION | _GROWTH | _ACCELERATOR
//   resolved via ?type= query param.
//
const BOOKINGS_URL = process.env.NEXT_PUBLIC_BOOKINGS_URL ?? "";

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-widest uppercase text-gray-500">{title}</h2>
        {badge}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

// ─── Main component ────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();

  const [step1Saved, setStep1Saved] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");

  const [basics, setBasics] = useState<BasicsForm>({
    contact_name: "",
    project_name: "",
    goals: "",
  });

  function setField<K extends keyof BasicsForm>(key: K, val: string) {
    setBasics((prev) => ({ ...prev, [key]: val }));
    // Clear any previous error when the user edits a field
    if (saveError) setSaveError("");
  }

  // Matches server-side minimums: name ≥ 2 chars, goals ≥ 10 chars
  const basicsValid =
    basics.contact_name.trim().length >= 2 &&
    basics.project_name.trim().length >= 2 &&
    basics.goals.trim().length >= 10;

  // ── Save Step 1 ────────────────────────────────────────────────────────────

  async function handleSaveBasics() {
    if (!basicsValid || saving) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/projects/${token}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: basics.contact_name.trim(),
          project_name: basics.project_name.trim(),
          goals:        basics.goals.trim(),
        }),
      });

      const json = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save. Please try again.");
      }

      // Only gate the booking panel on a confirmed server save
      setStep1Saved(true);

    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#05060a] px-4 py-16">
      <div className="max-w-xl mx-auto">

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/otwoone-logo-wordmark-white.png"
          alt="OTwoOne"
          width={110}
          className="mb-8 h-auto"
        />

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Your project portal</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Fill in the basics below so we can hit the ground running together.
          </p>
        </div>

        {/* ── Step 1: Basics ──────────────────────────────────────────────────── */}
        <div className="mb-4">
          <Card
            title="Step 1 — Basics"
            badge={
              step1Saved ? (
                <span className="text-xs font-medium text-green-400">Saved ✓</span>
              ) : null
            }
          >
            <div className="space-y-4">

              <Field label="Your name">
                <input
                  type="text"
                  value={basics.contact_name}
                  onChange={(e) => setField("contact_name", e.target.value)}
                  placeholder="e.g. Sarah Murphy"
                  disabled={step1Saved}
                  className={inputCls}
                />
              </Field>

              <Field label="Project name">
                <input
                  type="text"
                  value={basics.project_name}
                  onChange={(e) => setField("project_name", e.target.value)}
                  placeholder="e.g. New company website"
                  disabled={step1Saved}
                  className={inputCls}
                />
              </Field>

              <Field label="What are your main goals?">
                <textarea
                  value={basics.goals}
                  onChange={(e) => setField("goals", e.target.value)}
                  placeholder="e.g. Launch our new brand online, generate leads, and reduce our reliance on referrals."
                  rows={3}
                  disabled={step1Saved}
                  className={cx(inputCls, "resize-none")}
                />
              </Field>

              {/* Inline error — shown on API failure, cleared on next edit */}
              {saveError && (
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {saveError}
                </div>
              )}

              {!step1Saved && (
                <button
                  type="button"
                  onClick={handleSaveBasics}
                  disabled={!basicsValid || saving}
                  className={cx(
                    "w-full py-3 rounded-lg text-sm font-medium transition-all",
                    basicsValid && !saving
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-white/5 text-gray-600 cursor-not-allowed"
                  )}
                >
                  {saving ? "Saving…" : "Save & continue"}
                </button>
              )}

            </div>
          </Card>
        </div>

        {/* ── Book a call — only after server-confirmed Step 1 save ────────────── */}
        {step1Saved && BOOKINGS_URL && (
          <div className="mb-4 bg-indigo-500/[0.07] border border-indigo-500/20 rounded-xl px-5 py-5">
            <h2 className="text-sm font-semibold text-white mb-1">Book a call</h2>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Optional but recommended — a 30-minute call helps us align on priorities
              and answer any questions before we kick off.
            </p>
            <a
              href={BOOKINGS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Book now →
            </a>
          </div>
        )}

        {/* ── Step 2+ placeholder ─────────────────────────────────────────────── */}
        {step1Saved && (
          <div className="mb-4 opacity-60">
            <Card title="Step 2 — Project details">
              <p className="text-sm text-gray-500">Coming soon — we&apos;ll walk you through the next steps here.</p>
            </Card>
          </div>
        )}

      </div>
    </main>
  );
}
