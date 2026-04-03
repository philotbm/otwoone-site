"use client";

import { useState, useEffect } from "react";
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

type ClientBatch = {
  title: string;
  status: string;
  priority: string;
  completedWork?: {
    summary: string;
    completedAt: string;
  };
};

type ProjectProgress = {
  batches: ClientBatch[];
  upNext: string[];
  totalBatches: number;
  completedBatches: number;
};

const EMPTY_STEP2: Step2Form = {
  headline: "",
  subheadline: "",
  services: ["", "", "", "", "", ""],
  about: "",
  primary_cta: "",
};

const CTA_OPTIONS: { value: string; label: string }[] = [
  { value: "call",         label: "Phone call"   },
  { value: "email",        label: "Email"        },
  { value: "contact_form", label: "Contact form" },
  { value: "whatsapp",     label: "WhatsApp"     },
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

// ─── Review row ───────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <dt className="w-28 shrink-0 text-gray-600">{label}</dt>
      <dd className="text-gray-300 break-words min-w-0">{value}</dd>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();

  // ── Loading / hydration ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);

  // ── Navigation — which step is currently active ─────────────────────────────
  // step1Saved / step2Saved are capability flags (have been saved at least once).
  // currentStep controls which step is shown as active and editable.
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  // ── Step 3 state ────────────────────────────────────────────────────────────
  const [confirmed,   setConfirmed]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted,   setSubmitted]   = useState(false);

  // ── Progress state ─────────────────────────────────────────────────────────
  const [progress, setProgress] = useState<ProjectProgress | null>(null);

  // ── Hydrate from server on mount ────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;

    fetch(`/api/projects/${token}/intake`)
      .then((r) => r.json() as Promise<{
        step1: Record<string, unknown> | null;
        step2: Record<string, unknown> | null;
        completed_at: string | null;
      }>)
      .then((data) => {
        const s1   = data.step1;
        const s2   = data.step2;
        const done = !!data.completed_at;

        if (s1) {
          setBasics({
            contact_name: String(s1.contact_name ?? ""),
            project_name: String(s1.project_name ?? ""),
            goals:        String(s1.goals        ?? ""),
          });
          setStep1Saved(true);
        }

        if (s2) {
          const savedServices = Array.isArray(s2.services)
            ? (s2.services as unknown[]).map((x) => String(x ?? ""))
            : [];
          setStep2({
            headline:    String(s2.headline    ?? ""),
            subheadline: String(s2.subheadline ?? ""),
            services:    [...savedServices, "", "", "", "", "", ""].slice(0, 6),
            about:       String(s2.about       ?? ""),
            primary_cta: String(s2.primary_cta ?? ""),
          });
          setStep2Saved(true);
        }

        // Advance currentStep to match saved progress
        if (s2)      setCurrentStep(3);
        else if (s1) setCurrentStep(2);
        // else stays at 1

        if (done) setSubmitted(true);
      })
      .catch(() => {
        // Hydration failure is non-fatal; user can re-fill the form
      })
      .finally(() => {
        setLoading(false);
      });

    // Load project progress (non-blocking)
    fetch(`/api/projects/${token}/progress`)
      .then((r) => r.json() as Promise<{ progress: ProjectProgress | null }>)
      .then((data) => {
        if (data.progress) setProgress(data.progress);
      })
      .catch(() => { /* non-fatal */ });
  }, [token]);

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
      // If step 2 already saved (edit flow), go straight back to review
      setCurrentStep(step2Saved ? 3 : 2);

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
      setCurrentStep(3);

    } catch (err) {
      setSaveError2(
        err instanceof Error ? err.message : "Failed to save. Please try again."
      );
    } finally {
      setSaving2(false);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!confirmed || submitting || submitted) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/projects/${token}/intake/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to submit. Please try again.");
      }

      setSubmitted(true);

    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05060a] flex items-center justify-center">
        <p className="text-sm text-gray-600">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05060a] px-4 py-16">
      <div className="max-w-xl mx-auto">

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/otwoone-logo-wordmark-white.png"
          alt="StudioFlow"
          width={110}
          className="mb-8 h-auto"
        />

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Your project portal</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Fill in the basics below so we can hit the ground running together.
          </p>
          {!submitted && (
            <p className="mt-2 text-xs text-gray-600">Step {currentStep} of 3</p>
          )}
        </div>

        {/* ── Step 1: Basics ──────────────────────────────────────────────────── */}
        <div className="mb-4">
          <Card
            title="Step 1: Basics"
            badge={
              step1Saved && currentStep !== 1 ? (
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
                  disabled={step1Saved && currentStep !== 1}
                  className={inputCls}
                />
              </Field>

              <Field label="Project name">
                <input
                  type="text"
                  value={basics.project_name}
                  onChange={(e) => setField("project_name", e.target.value)}
                  placeholder="e.g. New company website"
                  disabled={step1Saved && currentStep !== 1}
                  className={inputCls}
                />
              </Field>

              <Field label="What are your main goals?">
                <textarea
                  value={basics.goals}
                  onChange={(e) => setField("goals", e.target.value)}
                  placeholder="e.g. Launch our new brand online, generate leads, and reduce our reliance on referrals."
                  rows={3}
                  disabled={step1Saved && currentStep !== 1}
                  className={cx(inputCls, "resize-none")}
                />
              </Field>

              {/* Inline error — shown on API failure, cleared on next edit */}
              {saveError && (
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {saveError}
                </div>
              )}

              {currentStep === 1 && (
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
              Optional but recommended. A 30-minute call helps us align on priorities
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
              title="Step 2: Project details"
              badge={
                step2Saved && currentStep !== 2 ? (
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
                    disabled={step2Saved && currentStep !== 2}
                    className={inputCls}
                  />
                </Field>

                <Field label="Sub-headline (optional)">
                  <input
                    type="text"
                    value={step2.subheadline}
                    onChange={(e) => setStep2Field("subheadline", e.target.value)}
                    placeholder="e.g. Fast, reliable &amp; fully insured, available 24/7"
                    disabled={step2Saved && currentStep !== 2}
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
                        disabled={step2Saved && currentStep !== 2}
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
                    placeholder="Tell us about your business: what you do, who you serve, and what makes you different."
                    rows={4}
                    disabled={step2Saved && currentStep !== 2}
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
                        disabled={step2Saved && currentStep !== 2}
                        onClick={() => {
                          setStep2Field("primary_cta", opt.value);
                        }}
                        className={cx(
                          "py-2.5 px-4 rounded-lg text-sm font-medium border transition-all text-left",
                          step2.primary_cta === opt.value
                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                            : "bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300",
                          step2Saved && currentStep !== 2 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
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

                {currentStep === 2 && (
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

        {/* ── Step 3: Review & submit — shown only when on step 3 ─────────────── */}
        {step2Saved && currentStep === 3 && (
          <div className="mb-4">
            <Card
              title="Step 3: Review & submit"
              badge={
                submitted ? (
                  <span className="text-xs font-medium text-green-400">Submitted ✓</span>
                ) : null
              }
            >
              <div className="space-y-5">

                {/* ── Summary: Step 1 ─────────────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium tracking-widest uppercase text-gray-600">Basics</p>
                    {!submitted && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <dl className="space-y-1.5">
                    <ReviewRow label="Name"    value={basics.contact_name} />
                    <ReviewRow label="Project" value={basics.project_name} />
                    <ReviewRow label="Goals"   value={basics.goals} />
                  </dl>
                </div>

                <div className="border-t border-white/5" />

                {/* ── Summary: Step 2 ─────────────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium tracking-widest uppercase text-gray-600">Project details</p>
                    {!submitted && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <dl className="space-y-1.5">
                    <ReviewRow label="Headline" value={step2.headline} />
                    {step2.subheadline && (
                      <ReviewRow label="Sub-headline" value={step2.subheadline} />
                    )}
                    <ReviewRow label="Services" value={validServices.join(", ")} />
                    <ReviewRow label="About"    value={step2.about} />
                    <ReviewRow
                      label="Primary CTA"
                      value={CTA_OPTIONS.find((o) => o.value === step2.primary_cta)?.label ?? step2.primary_cta}
                    />
                  </dl>
                </div>

                {/* ── Confirmation + submit / post-submit ─────────────────── */}
                {!submitted ? (
                  <>
                    <div className="border-t border-white/5" />

                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => {
                          setConfirmed(e.target.checked);
                          if (submitError) setSubmitError("");
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-400 leading-snug">
                        I confirm the above information is correct.
                      </span>
                    </label>

                    {submitError && (
                      <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!confirmed || submitting}
                      className={cx(
                        "w-full py-3 rounded-lg text-sm font-medium transition-all",
                        confirmed && !submitting
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                          : "bg-white/5 text-gray-600 cursor-not-allowed"
                      )}
                    >
                      {submitting ? "Submitting…" : "Submit"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Submission received</p>
                        <p className="text-xs text-gray-500">
                          Thanks, {basics.contact_name.trim().split(" ")[0]}. We&apos;ve got everything we need.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-white/5" />

                    <div>
                      <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-3">What happens next</p>
                      <ul className="space-y-2">
                        {[
                          "We'll review your brief and scope out the project.",
                          "You'll hear from us within 1–2 business days.",
                          "We may follow up with a short call to align on details.",
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

              </div>
            </Card>
          </div>
        )}

        {/* ── Project Progress — shown when revision data exists ─────────────── */}
        {progress && progress.batches.length > 0 && (
          <div className="mt-8">
            <Card title="Project Progress" badge={
              <span className="text-xs text-gray-500">
                {progress.completedBatches} of {progress.totalBatches} complete
              </span>
            }>
              <div className="space-y-6">

                {/* Progress bar */}
                <div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${progress.totalBatches > 0 ? (progress.completedBatches / progress.totalBatches) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Batch list */}
                <div className="space-y-3">
                  {progress.batches.map((batch, i) => {
                    const statusLabel =
                      batch.status === "complete" ? "Complete" :
                      batch.status === "in_progress" ? "In progress" :
                      batch.status === "ready" ? "Up next" :
                      "Planned";

                    const statusColor =
                      batch.status === "complete" ? "text-green-400" :
                      batch.status === "in_progress" ? "text-amber-400" :
                      batch.status === "ready" ? "text-blue-400" :
                      "text-gray-600";

                    const statusIcon =
                      batch.status === "complete" ? "✓" :
                      batch.status === "in_progress" ? "◐" :
                      batch.status === "ready" ? "→" :
                      "○";

                    return (
                      <div key={i} className={cx(
                        "rounded-lg border p-4",
                        batch.status === "complete" ? "border-green-500/15 bg-green-500/[0.02]" :
                        batch.status === "in_progress" ? "border-amber-500/15 bg-amber-500/[0.02]" :
                        "border-white/5 bg-white/[0.01]"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cx("text-sm", statusColor)}>{statusIcon}</span>
                            <span className={cx(
                              "text-sm",
                              batch.status === "complete" ? "text-gray-400" : "text-gray-200"
                            )}>
                              {batch.title}
                            </span>
                          </div>
                          <span className={cx("text-xs font-medium", statusColor)}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Show completed work summary if QA-passed run exists */}
                        {batch.completedWork && (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">
                              {batch.completedWork.summary}
                            </p>
                            <p className="text-[10px] text-gray-700 mt-1">
                              Completed {new Date(batch.completedWork.completedAt).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* What's next */}
                {progress.upNext.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-2">Coming up</p>
                    <ul className="space-y-1.5">
                      {progress.upNext.map((title, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500 flex-shrink-0" />
                          {title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </Card>
          </div>
        )}

      </div>
    </main>
  );
}
