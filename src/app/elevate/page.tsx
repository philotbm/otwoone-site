"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "idle" | "sending" | "done" | "error";
type Step = "engagement" | "clarifiers" | "context" | "contact";

type EngagementType =
  | "build_new"
  | "improve_existing"
  | "tech_advice"
  | "branding"
  | "ongoing_support";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeWebsite(w: string): string {
  const raw = (w || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// ─── Clarifier questions per engagement type ──────────────────────────────────

type ClarifierOption = { value: string; label: string };
type ClarifierQuestion = { key: string; question: string; options: ClarifierOption[] };

const CLARIFIERS: Record<EngagementType, ClarifierQuestion[]> = {
  build_new: [
    {
      key: "what_building",
      question: "What are you building?",
      options: [
        { value: "web_app",      label: "Web application or SaaS" },
        { value: "website",      label: "Marketing or informational website" },
        { value: "internal_tool",label: "Internal tool or portal" },
        { value: "ecommerce",    label: "E-commerce store" },
        { value: "not_sure",     label: "Not sure yet" },
      ],
    },
    {
      key: "design_ready",
      question: "Do you have designs or wireframes?",
      options: [
        { value: "yes",     label: "Yes — designs are ready" },
        { value: "partial", label: "Partially — some direction" },
        { value: "no",      label: "No — starting from scratch" },
      ],
    },
    {
      key: "team_involved",
      question: "Who will be involved on your side?",
      options: [
        { value: "just_me",  label: "Just me" },
        { value: "small",    label: "Small team (2–5 people)" },
        { value: "larger",   label: "Larger organisation" },
      ],
    },
  ],
  improve_existing: [
    {
      key: "what_to_improve",
      question: "What needs improving?",
      options: [
        { value: "performance",  label: "Performance or reliability" },
        { value: "design_ux",    label: "Design and UX" },
        { value: "new_features", label: "Add new features" },
        { value: "integrations", label: "Integrations or APIs" },
        { value: "not_sure",     label: "Not sure — need an assessment" },
      ],
    },
    {
      key: "current_tech",
      question: "What technology is it built on?",
      options: [
        { value: "custom",   label: "Custom-built application" },
        { value: "wordpress",label: "WordPress" },
        { value: "other_cms",label: "Other CMS or platform" },
        { value: "unknown",  label: "I'm not sure" },
      ],
    },
    {
      key: "urgency",
      question: "How urgent is this?",
      options: [
        { value: "critical",     label: "Critical — needs fixing now" },
        { value: "prioritised",  label: "Enhancement — prioritised" },
        { value: "nice_to_have", label: "Nice-to-have" },
      ],
    },
  ],
  tech_advice: [
    {
      key: "advice_area",
      question: "What area do you need guidance on?",
      options: [
        { value: "architecture",    label: "Technical architecture or stack decisions" },
        { value: "ai_automation",   label: "AI or automation opportunities" },
        { value: "team_hiring",     label: "Team structure or hiring" },
        { value: "delivery_review", label: "Delivery process or delivery review" },
        { value: "not_sure",        label: "Not sure — I need a sounding board" },
      ],
    },
    {
      key: "existing_team",
      question: "Do you have a technical team in place?",
      options: [
        { value: "yes",         label: "Yes — I have a technical team" },
        { value: "no",          label: "No — I need guidance on where to start" },
        { value: "contractors", label: "Mix of internal and contractors" },
      ],
    },
    {
      key: "advice_output",
      question: "What would be most useful?",
      options: [
        { value: "report",     label: "Audit report or written recommendation" },
        { value: "advisory",   label: "Ongoing advisory relationship" },
        { value: "workshop",   label: "Hands-on workshop or training session" },
      ],
    },
  ],
  branding: [
    {
      key: "branding_need",
      question: "What do you need?",
      options: [
        { value: "identity_new",    label: "Brand identity from scratch" },
        { value: "brand_refresh",   label: "Brand refresh" },
        { value: "design_system",   label: "Design system for a digital product" },
        { value: "website_design",  label: "Website design only (no development)" },
        { value: "not_sure",        label: "Not sure — open to recommendations" },
      ],
    },
    {
      key: "existing_brand",
      question: "Where are you starting from?",
      options: [
        { value: "nothing",   label: "Nothing yet — starting fresh" },
        { value: "some",      label: "Some brand elements (logo, colours)" },
        { value: "full_rebrand", label: "Full rebrand — replacing existing brand" },
      ],
    },
    {
      key: "branding_output",
      question: "What's the primary output?",
      options: [
        { value: "logo_visual",   label: "Logo and visual identity" },
        { value: "brand_guide",   label: "Full brand guidelines" },
        { value: "website_design_output", label: "Website design included" },
      ],
    },
  ],
  ongoing_support: [
    {
      key: "support_type",
      question: "What type of support?",
      options: [
        { value: "maintenance",  label: "Website maintenance and updates" },
        { value: "hosting",      label: "Hosting and security" },
        { value: "strategic",    label: "Strategic technology guidance" },
        { value: "dev_retainer", label: "Development retainer" },
      ],
    },
    {
      key: "existing_client",
      question: "Have you worked with OTwoOne before?",
      options: [
        { value: "new",       label: "New client" },
        { value: "returning", label: "Yes — returning client" },
      ],
    },
    {
      key: "support_frequency",
      question: "How often do you need support?",
      options: [
        { value: "ad_hoc",    label: "Ad hoc as needed" },
        { value: "monthly",   label: "Monthly retainer" },
        { value: "embedded",  label: "Embedded / ongoing" },
      ],
    },
  ],
};

// ─── Engagement options ────────────────────────────────────────────────────────

const ENGAGEMENT_OPTIONS: { value: EngagementType; label: string; sub: string }[] = [
  { value: "build_new",        label: "Build something new",                        sub: "Web apps, SaaS, sites, internal tools" },
  { value: "improve_existing", label: "Improve an existing website or system",      sub: "Performance, features, UX, integrations" },
  { value: "tech_advice",      label: "Technology advice / strategic guidance",     sub: "Architecture, AI, delivery, team decisions" },
  { value: "branding",         label: "Branding or design work",                    sub: "Identity, design systems, website design" },
  { value: "ongoing_support",  label: "Ongoing support",                            sub: "Maintenance, hosting, retainers" },
];

// ─── Budget options ────────────────────────────────────────────────────────────

const BUDGET_OPTIONS = [
  { value: "under_3k",  label: "Under €3k" },
  { value: "3k_5k",     label: "€3k–€5k" },
  { value: "5k_15k",    label: "€5k–€15k" },
  { value: "15k_40k",   label: "€15k–€40k" },
  { value: "40k_plus",  label: "€40k+" },
  { value: "not_sure",  label: "Not sure yet" },
];

const TIMELINE_OPTIONS = [
  { value: "asap",        label: "As soon as possible" },
  { value: "1_3_months",  label: "1–3 months" },
  { value: "3_6_months",  label: "3–6 months" },
  { value: "planning",    label: "Planning ahead" },
];

const AUTHORITY_OPTIONS = [
  { value: "yes",    label: "Yes — I'm the decision maker" },
  { value: "shared", label: "Shared — need sign-off from others" },
  { value: "no",     label: "No — I'm gathering information" },
];

// ─── Option button ─────────────────────────────────────────────────────────────

function OptionBtn({
  selected, onClick, children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all",
        selected
          ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
          : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/25 hover:bg-white/[0.06]"
      )}
    >
      {children}
    </button>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-widest uppercase text-indigo-400 mb-4">
      {children}
    </p>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ElevatePage() {
  // Step state
  const [step, setStep] = useState<Step>("engagement");

  // Engagement
  const [engagementType, setEngagementType] = useState<EngagementType | "">("");

  // Clarifiers: map of question key → selected option value
  const [clarifierAnswers, setClarifierAnswers] = useState<Record<string, string>>({});

  // Context
  const [budget, setBudget]                   = useState("");
  const [timeline, setTimeline]               = useState("");
  const [successDefinition, setSuccessDefinition] = useState("");

  // Contact
  const [name, setName]                       = useState("");
  const [email, setEmail]                     = useState("");
  const [company, setCompany]                 = useState("");
  const [website, setWebsite]                 = useState("");
  const [role, setRole]                       = useState("");
  const [decisionAuthority, setDecisionAuthority] = useState("");

  // Submit state
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Derived
  const clarifierQuestions =
    engagementType ? CLARIFIERS[engagementType] ?? [] : [];

  const clarifierComplete = clarifierQuestions.every(
    (q) => clarifierAnswers[q.key]
  );

  // ── Navigation helpers ───────────────────────────────────────────────────────

  function goToStep(s: Step) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep(s);
  }

  function handleEngagementNext() {
    if (!engagementType) return;
    // Reset clarifiers when engagement type changes
    setClarifierAnswers({});
    goToStep("clarifiers");
  }

  function handleClarifiersNext() {
    goToStep("context");
  }

  function handleContextNext() {
    if (!successDefinition.trim()) return;
    goToStep("contact");
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/elevate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name:       name.trim() || null,
          contact_email:      email.trim(),
          company_name:       company.trim() || null,
          company_website:    normalizeWebsite(website) || null,
          role:               role.trim() || null,
          decision_authority: decisionAuthority || null,
          engagement_type:    engagementType,
          budget:             budget || null,
          timeline:           timeline || null,
          success_definition: successDefinition.trim() || null,
          clarifier_answers:  clarifierAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Submission failed");
      }

      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  // ── Confirmation screen ──────────────────────────────────────────────────────

  if (status === "done") {
    return (
      <main className="min-h-screen bg-[#05060a] flex items-center justify-center px-4 py-24">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/15 border border-indigo-500/30 mb-6">
            <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-3">We've received your details</h1>
          <p className="text-gray-400 leading-relaxed">
            Thanks for getting in touch. We'll review your submission and be in touch within 1–2 business days.
          </p>
        </div>
      </main>
    );
  }

  // ── Form layout ──────────────────────────────────────────────────────────────

  const stepIndex: Record<Step, number> = {
    engagement: 0, clarifiers: 1, context: 2, contact: 3,
  };
  const currentStepIndex = stepIndex[step];

  return (
    <main className="min-h-screen bg-[#05060a] px-4 py-20">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/otwoone-logo-wordmark-white.png" alt="OTwoOne" width={120} className="mb-5 h-auto" />
          <h1 className="text-3xl font-semibold text-white mb-3">Tell us about your project</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            We'll use this to understand what you need and come back to you with a clear way forward.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-10">
          {(["engagement", "clarifiers", "context", "contact"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={cx(
                "h-1 rounded-full transition-all",
                i <= currentStepIndex ? "bg-indigo-500" : "bg-white/10",
                i === currentStepIndex ? "w-8" : "w-4"
              )}
            />
          ))}
        </div>

        {/* ── Step 1: Engagement Type ────────────────────────────────────────── */}
        {step === "engagement" && (
          <div className="space-y-3">
            <SectionLabel>What brings you here?</SectionLabel>

            {ENGAGEMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEngagementType(opt.value)}
                className={cx(
                  "w-full text-left px-5 py-4 rounded-xl border transition-all",
                  engagementType === opt.value
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                )}
              >
                <span className={cx(
                  "block text-sm font-medium mb-0.5",
                  engagementType === opt.value ? "text-indigo-200" : "text-gray-200"
                )}>
                  {opt.label}
                </span>
                <span className="block text-xs text-gray-500">{opt.sub}</span>
              </button>
            ))}

            <div className="pt-4">
              <button
                type="button"
                onClick={handleEngagementNext}
                disabled={!engagementType}
                className={cx(
                  "w-full py-3 rounded-lg text-sm font-medium transition-all",
                  engagementType
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                )}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Clarifiers ────────────────────────────────────────────── */}
        {step === "clarifiers" && engagementType && (
          <div className="space-y-8">
            <SectionLabel>
              {ENGAGEMENT_OPTIONS.find(e => e.value === engagementType)?.label}
            </SectionLabel>

            {clarifierQuestions.map((q) => (
              <div key={q.key}>
                <p className="text-sm text-gray-300 mb-3">{q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <OptionBtn
                      key={opt.value}
                      selected={clarifierAnswers[q.key] === opt.value}
                      onClick={() =>
                        setClarifierAnswers((prev) => ({ ...prev, [q.key]: opt.value }))
                      }
                    >
                      {opt.label}
                    </OptionBtn>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => goToStep("engagement")}
                className="flex-1 py-3 rounded-lg text-sm font-medium border border-white/10 text-gray-400 hover:text-gray-300 hover:border-white/20 transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleClarifiersNext}
                disabled={!clarifierComplete}
                className={cx(
                  "flex-2 flex-grow py-3 rounded-lg text-sm font-medium transition-all",
                  clarifierComplete
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                )}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Context ───────────────────────────────────────────────── */}
        {step === "context" && (
          <div className="space-y-8">
            {/* Budget */}
            <div>
              <SectionLabel>Budget</SectionLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BUDGET_OPTIONS.map((opt) => (
                  <OptionBtn
                    key={opt.value}
                    selected={budget === opt.value}
                    onClick={() => setBudget(opt.value)}
                  >
                    {opt.label}
                  </OptionBtn>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <SectionLabel>Timeline</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {TIMELINE_OPTIONS.map((opt) => (
                  <OptionBtn
                    key={opt.value}
                    selected={timeline === opt.value}
                    onClick={() => setTimeline(opt.value)}
                  >
                    {opt.label}
                  </OptionBtn>
                ))}
              </div>
            </div>

            {/* Success definition */}
            <div>
              <SectionLabel>Success definition</SectionLabel>
              <p className="text-xs text-gray-500 mb-3">
                How will you know this has been a success? Be specific.
              </p>
              <textarea
                value={successDefinition}
                onChange={(e) => setSuccessDefinition(e.target.value)}
                placeholder="e.g. We launch the new site before Q3, reduce bounce rate, and start getting inbound leads from search..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => goToStep("clarifiers")}
                className="flex-1 py-3 rounded-lg text-sm font-medium border border-white/10 text-gray-400 hover:text-gray-300 hover:border-white/20 transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleContextNext}
                disabled={!successDefinition.trim()}
                className={cx(
                  "flex-2 flex-grow py-3 rounded-lg text-sm font-medium transition-all",
                  successDefinition.trim()
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                )}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Contact ───────────────────────────────────────────────── */}
        {step === "contact" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <SectionLabel>Your details</SectionLabel>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email <span className="text-indigo-400">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Website</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="yourcompany.com"
                  className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Your role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Founder, Head of Product, Marketing Manager"
                className="w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60"
              />
            </div>

            {/* Decision authority */}
            <div>
              <label className="block text-xs text-gray-500 mb-3">Decision authority</label>
              <div className="space-y-2">
                {AUTHORITY_OPTIONS.map((opt) => (
                  <OptionBtn
                    key={opt.value}
                    selected={decisionAuthority === opt.value}
                    onClick={() => setDecisionAuthority(opt.value)}
                  >
                    {opt.label}
                  </OptionBtn>
                ))}
              </div>
            </div>

            {/* Error */}
            {status === "error" && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {errorMsg || "Something went wrong. Please try again."}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => goToStep("context")}
                className="flex-1 py-3 rounded-lg text-sm font-medium border border-white/10 text-gray-400 hover:text-gray-300 hover:border-white/20 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!email.trim() || status === "sending"}
                className={cx(
                  "flex-2 flex-grow py-3 rounded-lg text-sm font-medium transition-all",
                  email.trim() && status !== "sending"
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                )}
              >
                {status === "sending" ? "Sending…" : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
