"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type BasicsForm = {
  contact_name: string;
  project_name: string;
  goals: string;
};

type Step2Form = {
  headline: string;
  subheadline: string;
  services: string[]; // 6 slots; min 3 must be ≥ 2 chars
  about: string;
  primary_cta: string;
};

const EMPTY_STEP2: Step2Form = {
  headline: "",
  subheadline: "",
  services: ["", "", "", "", "", ""],
  about: "",
  primary_cta: "",
};

const CTA_OPTIONS: { value: string; label: string }[] = [
  { value: "call",         label: "Phone call"    },
  { value: "email",        label: "Email"         },
  { value: "contact_form", label: "Contact form"  },
  { value: "whatsapp",     label: "WhatsApp"      },
];

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

  // ── Step 1 state ────────────────────────────────────────────────────────────
  const [step1Saved, setStep1Saved] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState("");

  const [basics, setBasics] = useState<BasicsForm>({
    contact_name: "",
    project_name: "",
    goals: "",
  });

  function setField<K extends keyof BasicsForm>(key: K, val: string) {
    setBasics((prev) => ({ ...prev, [key]: val }));
    if (saveError) setSaveError("");
  }

  // Matches server-side minimums: name ≥ 2 chars, goals ≥ 10 chars
  const basicsValid =
    basics.contact_name.trim().length >= 2 &&
    basics.project_name.trim().length >= 2 &&
    basics.goals.trim().length >= 10;

  // ── Step 2 state ────────────────────────────────────────────────────────────
  const [step2Saved,  setStep2Saved]  = useState(false);
  const [saving2,     setSaving2]     = useState(false);
  const [saveError2,  setSaveError2]  = useState("");

  const [step2, setStep2] = useState<Step2Form>(EMPTY_STEP2);

  function setStep2Field<K extends keyof Omit<Step2Form, "services">>(key: K, val: string) {
    setStep2((prev) => ({ ...prev, [key]: val }));
    if (saveError2) setSaveError2("");
  }

  function setService(index: number, val: string) {
    setStep2((prev) => {
      const services = [...prev.services];
      services[index] = val;
      return { ...prev, services };
    });
    if (saveError2) setSaveError2("");
  }

  // Valid services: entries with ≥ 2 chars
  const validServices = step2.services.map((s) => s.trim()).filter((s) => s.length >= 2);

  const step2Valid =
    step2.headline.trim().length >= 4 &&
    validServices.length >= 3 &&
    step2.about.trim().length >= 40 &&
    step2.primary_cta !== "";

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

      setStep1Saved(true);

    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Save Step 2 ────────────────────────────────────────────────────────────

  async function handleSaveStep2() {
    if (!step2Valid || saving2) return;
    setSaving2(true);
    setSaveError2("");

    try {
      const res = await fetch(`/api/projects/${token}/intake/step2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline:    step2.headline.trim(),
          subheadline: step2.subheadline.trim(),
          services:    validServices,
          about:       step2.about.trim(),
          primary_cta: step2.primary_cta,
        }),
      });

      const json = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to save. Please try again.");
      }

      setStep2Saved(true);

    } catch (err) {
      setSaveError2(
        err instanceof Error ? err.message : "Failed to save. Please try again."
      );
    } finally {
      setSaving2(false);
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

        {/* ── Step 2: Project details ──────────────────────────────────────────── */}
        {step1Saved && (
          <div className="mb-4">
            <Card
              title="Step 2 — Project details"
              badge={
                step2Saved ? (
                  <span className="text-xs font-medium text-green-400">Saved ✓</span>
                ) : null
              }
            >
              <div className="space-y-4">

                <Field label="Website headline">
                  <input
                    type="text"
                    value={step2.headline}
                    onChange={(e) => setStep2Field("headline", e.target.value)}
                    placeholder="e.g. Expert Plumbing Services in Dublin"
                    disabled={step2Saved}
                    className={inputCls}
                  />
                </Field>

                <Field label="Sub-headline (optional)">
                  <input
                    type="text"
                    value={step2.subheadline}
                    onChange={(e) => setStep2Field("subheadline", e.target.value)}
                    placeholder="e.g. Fast, reliable &amp; fully insured — available 24/7"
                    disabled={step2Saved}
                    className={inputCls}
                  />
                </Field>

                <Field label="Services you offer (enter at least 3)">
                  <div className="space-y-2">
                    {step2.services.map((svc, i) => (
                      <input
                        key={i}
                        type="text"
                        value={svc}
                        onChange={(e) => setService(i, e.target.value)}
                        placeholder={`Service ${i + 1}${i < 3 ? " *" : ""}`}
                        disabled={step2Saved}
                        className={inputCls}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-600">
                    {validServices.length < 3
                      ? `${3 - validServices.length} more required`
                      : `${validServices.length} service${validServices.length !== 1 ? "s" : ""} entered`}
                  </p>
                </Field>

                <Field label="About your business">
                  <textarea
                    value={step2.about}
                    onChange={(e) => setStep2Field("about", e.target.value)}
                    placeholder="Tell us about your business — what you do, who you serve, and what makes you different."
                    rows={4}
                    disabled={step2Saved}
                    className={cx(inputCls, "resize-none")}
                  />
                  <p className="mt-1.5 text-xs text-gray-600">
                    {step2.about.trim().length < 40
                      ? `${40 - step2.about.trim().length} more characters needed`
                      : ""}
                  </p>
                </Field>

                <Field label="Primary call-to-action">
                  <div className="grid grid-cols-2 gap-2">
                    {CTA_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={step2Saved}
                        onClick={() => {
                          setStep2Field("primary_cta", opt.value);
                        }}
                        className={cx(
                          "py-2.5 px-4 rounded-lg text-sm font-medium border transition-all text-left",
                          step2.primary_cta === opt.value
                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                            : "bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300",
                          step2Saved ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Inline error */}
                {saveError2 && (
                  <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    {saveError2}
                  </div>
                )}

                {!step2Saved && (
                  <button
                    type="button"
                    onClick={handleSaveStep2}
                    disabled={!step2Valid || saving2}
                    className={cx(
                      "w-full py-3 rounded-lg text-sm font-medium transition-all",
                      step2Valid && !saving2
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "bg-white/5 text-gray-600 cursor-not-allowed"
                    )}
                  >
                    {saving2 ? "Saving…" : "Save & continue"}
                  </button>
                )}

              </div>
            </Card>
          </div>
        )}

        {/* ── Step 3 placeholder — shown after Step 2 saved ────────────────────── */}
        {step2Saved && (
          <div className="mb-4 opacity-60">
            <Card title="Step 3 — Review & submit">
              <p className="text-sm text-gray-500">Coming next — we&apos;ll walk you through the final steps here.</p>
            </Card>
          </div>
        )}

      </div>
    </main>
  );
}
