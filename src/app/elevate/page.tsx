"use client";

import React, { FormEvent, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "idle" | "sending" | "done" | "error";
type PillarKey = "studio" | "consultancy" | "branding";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeWebsite(w: string): string {
  const raw = (w || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// ─── Pillar definitions ───────────────────────────────────────────────────────

type PillarDef = { key: PillarKey; label: string; sub: string; desc: string };

const PILLARS: PillarDef[] = [
  {
    key: "studio",
    label: "Studio Development",
    sub: "Websites · Apps · Digital Tools · Systems",
    desc: "Websites, apps, and digital tools. Built properly and delivered on time.",
  },
  {
    key: "consultancy",
    label: "Consultancy",
    sub: "Technology Advice · AI/Automation · Process Review",
    desc: "Expert technology advice for business owners making important decisions.",
  },
  {
    key: "branding",
    label: "Branding & Design",
    sub: "Identity · Messaging · Visual Systems",
    desc: "Brand strategy, visual identity, and design that tells the right story.",
  },
];

// ─── Style constants ──────────────────────────────────────────────────────────

const S = {
  page:    "min-h-screen bg-[#05060a] text-white relative overflow-x-hidden",
  glow:    "absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-30 bg-gradient-to-b from-indigo-600/30 via-slate-900/0 to-transparent pointer-events-none",
  wrap:    "relative mx-auto w-full max-w-5xl px-6 py-14",
  card:    "rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.55)]",
  inner:   "rounded-2xl border border-white/10 bg-white/[0.02]",
  label:   "text-sm text-white/70",
  input:   "mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-indigo-500/40",
  select:  "mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer appearance-none",
  textarea:"mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[110px]",
  tileBase:"relative rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 text-left transition-all duration-200 cursor-pointer",
  tileOn:  "border-indigo-400/40 bg-indigo-500/20 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]",
  pillBase:"absolute right-4 top-4 grid place-items-center h-5 w-5 rounded-full border border-white/15 transition-all duration-200",
  pillOn:  "bg-indigo-500 border-indigo-400/60",
  section: "mt-10",
  h2:      "text-xl font-semibold tracking-tight text-white",
  divider: "border-t border-white/8 pt-6 mt-6",
};

// ─── Sub-question: Sel component ──────────────────────────────────────────────

function Sel({
  label,
  value,
  onChange,
  options,
  span2 = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "md:col-span-2" : ""}>
      <div className={S.label}>{label}</div>
      <select
        className={S.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ElevatePage() {
  const [status, setStatus]   = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Pillars
  const [pillars, setPillars]         = useState<PillarKey[]>(["studio"]);
  const [primaryPillar, setPrimary]   = useState<PillarKey>("studio");

  // Contact
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");

  // Common
  const [budget,   setBudget]   = useState("");
  const [timing,   setTiming]   = useState("");
  const [extra,    setExtra]    = useState("");

  // Studio
  const [studioWhat,     setStudioWhat]     = useState("");
  const [studioEngType,  setStudioEngType]  = useState("");
  const [studioCodebase, setStudioCodebase] = useState("");

  // Consultancy
  const [conSupport,   setConSupport]   = useState("");
  const [conCadence,   setConCadence]   = useState("");
  const [conTeamSize,  setConTeamSize]  = useState("");

  // Branding
  const [brandNeed,    setBrandNeed]    = useState("");
  const [brandExisting,setBrandExisting] = useState("");
  const [brandOutput,  setBrandOutput]  = useState("");

  // ── Derived ───────────────────────────────────────────────────────────────

  const pillarSet = useMemo(() => new Set(pillars), [pillars]);

  const hasStudio      = pillarSet.has("studio");
  const hasConsultancy = pillarSet.has("consultancy");
  const hasBranding    = pillarSet.has("branding");

  // ── Handlers ──────────────────────────────────────────────────────────────

  function togglePillar(key: PillarKey) {
    setPillars((prev) => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];
      const safe = next.length ? next : ["studio" as PillarKey];
      if (!safe.includes(primaryPillar)) setPrimary(safe[0]);
      return safe;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setStatus("sending");

    if (!email.trim()) {
      setStatus("error");
      setErrorMsg("Please enter an email so we can reply.");
      return;
    }

    const answers: Record<string, unknown> = {
      // Pillar selections
      pillars,
      primary_pillar: primaryPillar,

      // Common
      budget:  budget  || undefined,
      timing:  timing  || undefined,
      extra:   extra   || undefined,

      // Studio-specific
      studio: hasStudio ? {
        what:      studioWhat     || undefined,
        eng_type:  studioEngType  || undefined,
        codebase:  studioCodebase || undefined,
      } : undefined,

      // Consultancy-specific
      consultancy: hasConsultancy ? {
        support:   conSupport  || undefined,
        cadence:   conCadence  || undefined,
        team_size: conTeamSize || undefined,
      } : undefined,

      // Branding-specific
      branding: hasBranding ? {
        need:     brandNeed     || undefined,
        existing: brandExisting || undefined,
        output:   brandOutput   || undefined,
      } : undefined,

      // Legacy-compatible fields for the API's quote engine
      services: pillars,
      primary_service: primaryPillar,
      need_help: pillars.join(", "),
    };

    try {
      const res = await fetch("/api/elevate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name:     name,
          contact_email:    email,
          company_name:     company,
          company_website:  normalizeWebsite(website),
          answers,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Submission failed");

      setStatus("done");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={S.page}>
      <div className={S.glow} />

      <div className={S.wrap}>
        {/* Header */}
        <div className="mb-10 flex items-start gap-6">
          <a href="/" className="pt-1">
            <img
              src="/branding/otwoone-logo.png"
              alt="OTwoOne"
              className="h-12 w-auto opacity-90"
            />
          </a>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight leading-snug text-white">
              Tell us what you need
            </h1>
            <p className="mt-1 text-sm md:text-base text-white/60">
              Fill in your details below. Once received, we&apos;ll review your brief,
              prepare a quote, and come back within one business day to arrange a
              scoping call.
            </p>
          </div>
        </div>

        {/* Step 1 of 5 progress indicator */}
        <div className="mb-8 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-black shrink-0">
              1
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Step 1 of 5 · Tell us what you need</p>
              <p className="text-xs text-white/40 mt-0.5">Fill in the form below and submit your brief</p>
            </div>
          </div>
          <div className="mt-4 ml-3.5 pl-6 border-l border-white/10 space-y-2">
            {[
              { n: "2", label: "We review & send a quote" },
              { n: "3", label: "Scoping call or meeting" },
              { n: "4", label: "You accept & pay deposit" },
              { n: "5", label: "Build begins" },
            ].map((step) => (
              <div key={step.n} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[10px] text-white/35 shrink-0">
                  {step.n}
                </span>
                <span className="text-xs text-white/35">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className={cx(S.card, "p-6 md:p-8")}>

          {/* ─── Section 1: Pillars ─── */}
          <div>
            <h2 className={S.h2}>What are you looking for help with?</h2>
            <p className="mt-1.5 text-sm text-white/50">Select all that apply.</p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {PILLARS.map((p) => {
                const on = pillarSet.has(p.key);
                return (
                  <button
                    type="button"
                    key={p.key}
                    onClick={() => togglePillar(p.key)}
                    className={cx(S.tileBase, on && S.tileOn)}
                  >
                    <span className={cx(S.pillBase, on && S.pillOn)}>
                      {on && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <div className="text-base font-semibold pr-8">{p.label}</div>
                    <div className="mt-0.5 text-xs text-white/45 font-medium">{p.sub}</div>
                    <div className="mt-2 text-sm text-white/55 leading-snug">{p.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Primary pillar (only if 2+ selected) */}
            {pillars.length > 1 && (
              <div className={cx(S.inner, "mt-5 p-5")}>
                <div className="text-sm font-semibold text-white/80">
                  Which is the main priority?
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {pillars.map((pk) => {
                    const def = PILLARS.find((d) => d.key === pk)!;
                    return (
                      <label
                        key={pk}
                        className={cx(
                          "flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 cursor-pointer transition-all duration-150",
                          primaryPillar === pk && "border-indigo-400/40 bg-indigo-500/10"
                        )}
                      >
                        <input
                          type="radio"
                          name="primary_pillar"
                          className="h-4 w-4 accent-indigo-500"
                          checked={primaryPillar === pk}
                          onChange={() => setPrimary(pk)}
                        />
                        <span className="text-sm">{def.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ─── Section 2: Studio questions ─── */}
          {hasStudio && (
            <div className={cx(S.section, S.divider)}>
              <h2 className={S.h2}>Studio Development</h2>
              <p className="mt-1.5 text-sm text-white/50">
                Tell us a little about what you&apos;re looking to build.
              </p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Sel
                  label="What are you building?"
                  value={studioWhat}
                  onChange={setStudioWhat}
                  options={[
                    "A new product or service",
                    "An upgrade or rebuild of something that already exists",
                    "A website to grow or promote my business",
                    "An internal tool or dashboard for my team",
                    "Not sure yet",
                  ]}
                  span2
                />
                <Sel
                  label="How would you like to work together?"
                  value={studioEngType}
                  onChange={setStudioEngType}
                  options={[
                    "Start with a planning session before any build",
                    "Fixed-price project",
                    "Ongoing development support (monthly)",
                    "Not sure yet",
                  ]}
                />
                <Sel
                  label="Is there existing work to build on?"
                  value={studioCodebase}
                  onChange={setStudioCodebase}
                  options={[
                    "Starting from scratch",
                    "Yes, there's an existing system or codebase",
                    "There's a prototype or partial build",
                    "Not applicable",
                  ]}
                />
              </div>
            </div>
          )}

          {/* ─── Section 3: Consultancy questions ─── */}
          {hasConsultancy && (
            <div className={cx(S.section, S.divider)}>
              <h2 className={S.h2}>Consultancy</h2>
              <p className="mt-1.5 text-sm text-white/50">
                Tell us about the kind of help you&apos;re looking for.
              </p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Sel
                  label="What kind of support?"
                  value={conSupport}
                  onChange={setConSupport}
                  options={[
                    "Part-time technology director or tech leadership",
                    "Advice on using AI or automation to improve my business",
                    "A review of how my team works and delivers",
                    "Outcome-based advisory",
                    "Not sure yet",
                  ]}
                  span2
                />
                <Sel
                  label="How often?"
                  value={conCadence}
                  onChange={setConCadence}
                  options={[
                    "One-off review or assessment",
                    "Monthly advisory",
                    "Ongoing, embedded support",
                    "Not sure yet",
                  ]}
                />
                <Sel
                  label="Team size"
                  value={conTeamSize}
                  onChange={setConTeamSize}
                  options={[
                    "Just me / founder",
                    "2–10 people",
                    "11–50 people",
                    "50+ people",
                  ]}
                />
              </div>
            </div>
          )}

          {/* ─── Section 4: Branding questions ─── */}
          {hasBranding && (
            <div className={cx(S.section, S.divider)}>
              <h2 className={S.h2}>Branding & Design</h2>
              <p className="mt-1.5 text-sm text-white/50">
                Tell us about your brand and what you need.
              </p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Sel
                  label="What do you need?"
                  value={brandNeed}
                  onChange={setBrandNeed}
                  options={[
                    "Brand strategy and messaging (what we stand for and how we say it)",
                    "Full visual identity (logo, colours, fonts, brand guide)",
                    "Brand and website together",
                    "Design guidelines and component library for a digital product",
                    "Ongoing brand or design support",
                    "Not sure yet",
                  ]}
                  span2
                />
                <Sel
                  label="Existing brand?"
                  value={brandExisting}
                  onChange={setBrandExisting}
                  options={[
                    "Starting from scratch",
                    "We have some brand elements but need more",
                    "Full rebrand of an existing brand",
                  ]}
                />
                <Sel
                  label="What do you need delivered?"
                  value={brandOutput}
                  onChange={setBrandOutput}
                  options={[
                    "Strategy and messaging document",
                    "Visual assets (logo, colours, fonts)",
                    "Both strategy + visual assets",
                  ]}
                />
              </div>
            </div>
          )}

          {/* ─── Section 5: Common details ─── */}
          <div className={cx(S.section, S.divider)}>
            <h2 className={S.h2}>Budget &amp; timeline</h2>
            <p className="mt-1.5 text-sm text-white/50">
              This helps us tailor our response. No commitment required.
            </p>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Sel
                label="Budget range"
                value={budget}
                onChange={setBudget}
                options={[
                  "Under €3k",
                  "€3k–€5k",
                  "€5k–€15k",
                  "€15k–€40k",
                  "€40k–€100k",
                  "€100k+",
                  "Prefer to discuss",
                ]}
              />
              <Sel
                label="Timeline"
                value={timing}
                onChange={setTiming}
                options={[
                  "ASAP (within 4 weeks)",
                  "1–3 months",
                  "3–6 months",
                  "Planning ahead (6 months+)",
                ]}
              />
              <div className="md:col-span-2">
                <div className={S.label}>Anything else we should know?</div>
                <textarea
                  className={S.textarea}
                  placeholder="Optional — tell us anything else that's useful. What does success look like? Any links? Any deadlines?"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ─── Section 6: Contact ─── */}
          <div className={cx(S.section, S.divider)}>
            <h2 className={S.h2}>Your details</h2>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className={S.label}>Name</div>
                <input
                  className={S.input}
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <div className={S.label}>
                  Email <span className="text-indigo-300">*</span>
                </div>
                <input
                  type="email"
                  className={S.input}
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className={S.label}>Company</div>
                <input
                  className={S.input}
                  placeholder="Company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div>
                <div className={S.label}>Website <span className="text-white/35 text-xs">(optional)</span></div>
                <input
                  className={S.input}
                  placeholder="yoursite.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ─── Submit ─── */}
          <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/35 max-w-xs leading-relaxed">
              Submitting this form asks OTwoOne to review your details and get back to you by email.
              We respond within one business day.
            </p>
            <button
              type="submit"
              disabled={status === "sending"}
              className={cx(
                "rounded-xl px-7 py-3 text-sm font-semibold transition-colors shrink-0",
                status === "sending"
                  ? "bg-white/10 text-white/50 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90"
              )}
            >
              {status === "sending" ? "Submitting…" : "Submit brief"}
            </button>
          </div>

          {status === "done" && (
            <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              ✓ Brief received. We&apos;ll review your details and reply within one business day.
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              {errorMsg || "Something went wrong. Please try again or email info@otwoone.ie."}
            </div>
          )}
        </form>

        <div className="mt-10 text-center text-xs text-white/25">
          OTwoOne · Studio · Consultancy · Branding · Cork, Ireland
        </div>
      </div>
    </div>
  );
}
