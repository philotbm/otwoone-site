"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

type Status = "idle" | "sending" | "done" | "error";
type Stage = 1 | 2;

type NeedHelp = "website" | "automation" | "branding" | "consultancy" | "combo";
type NotSureFocus = "" | "website" | "automation" | "branding" | "consultancy";
type Timing = "" | "asap" | "1-2" | "this_quarter" | "exploring";

export default function ElevatePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<Stage>(1);

  // Stage 1 (branch + contact)
  const [needHelp, setNeedHelp] = useState<NeedHelp | "">("");
  const [notSureFocus, setNotSureFocus] = useState<NotSureFocus>("");

  const [timing, setTiming] = useState<Timing>("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Stage 2 (shared)
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [goal, setGoal] = useState("");

  const [budget, setBudget] = useState<
    "" | "under3" | "3-7" | "7-15" | "15-30" | "30plus"
  >("");

  const [extra, setExtra] = useState("");

  // Automation / systems
  const [toolsCore, setToolsCore] = useState<
    "" | "m365" | "google" | "mixed" | "unknown"
  >("");
  const [toolsMicrosoftDepth, setToolsMicrosoftDepth] = useState<
    "" | "basic" | "teams_sp" | "some_auto" | "underused"
  >("");
  const [aiUsage, setAiUsage] = useState<
    "" | "no" | "experimenting" | "weekly" | "copilot" | "structured"
  >("");
  const [aiTools, setAiTools] = useState<string[]>([]);

  const [breakdown, setBreakdown] = useState<
    "" |
    "leads" |
    "quoting" |
    "delivery" |
    "finance" |
    "comms" |
    "reporting" |
    "no_process"
  >("");

  // Website
  const [websiteType, setWebsiteType] = useState<
    "" | "landing" | "multi" | "ecommerce" | "redesign" | "notsure"
  >("");
  const [hasBranding, setHasBranding] = useState<"" | "yes" | "no" | "partial">(
    ""
  );

  // Branding
  const [brandingNeed, setBrandingNeed] = useState<
    "" | "logo" | "identity" | "rebrand" | "strategy_messaging" | "notsure"
  >("");

  // Consultancy
  const [consultancyFocus, setConsultancyFocus] = useState<
    "" | "strategy" | "operations" | "training" | "growth" | "all"
  >("");

  const showToolsSection = useMemo(() => needHelp === "automation", [needHelp]);
  const showWebsiteSection = useMemo(() => needHelp === "website", [needHelp]);
  const showBrandingSection = useMemo(() => needHelp === "branding", [needHelp]);
  const showConsultancySection = useMemo(
    () => needHelp === "consultancy",
    [needHelp]
  );

  const showBreakdown = useMemo(() => {
    // Keep this only where it adds value:
    // - automation
    // - consultancy (if you later decide it’s not needed here, remove the consultancy part)
    return needHelp === "automation" || needHelp === "consultancy";
  }, [needHelp]);

  function toggleArrayValue(arr: string[], val: string) {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  function stage1IsValid() {
    if (!needHelp) return false;
    // "Not sure yet" must be triaged into a real branch before continuing
    if (needHelp === "combo") return false;

    if (!timing) return false;
    if (!contactName.trim()) return false;
    if (!contactEmail.trim()) return false;

    return true;
  }

  function humanBudget(v: typeof budget) {
    switch (v) {
      case "under3":
        return "Under €3k";
      case "3-7":
        return "€3k–€7k";
      case "7-15":
        return "€7k–€15k";
      case "15-30":
        return "€15k–€30k";
      case "30plus":
        return "€30k+";
      default:
        return "";
    }
  }

  function humanTiming(v: typeof timing) {
    switch (v) {
      case "asap":
        return "ASAP (2–4 weeks)";
      case "1-2":
        return "Next month or two";
      case "this_quarter":
        return "This quarter";
      case "exploring":
        return "Just exploring";
      default:
        return "";
    }
  }

  function humanNeedHelp(v: typeof needHelp) {
    switch (v) {
      case "website":
        return "Website";
      case "automation":
        return "Automation / backend system";
      case "branding":
        return "Branding";
      case "consultancy":
        return "Consultancy";
      case "combo":
        return "Not sure yet";
      default:
        return "";
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const payload = {
      contact_name: contactName,
      contact_email: contactEmail,
      company_name: companyName,
      company_website: companyWebsite,
      answers: {
        need_help: humanNeedHelp(needHelp),
        timing: humanTiming(timing),

        goal,

        breakdown,

        budget: humanBudget(budget),

        // Automation / systems
        tools_core: toolsCore,
        microsoft_depth: toolsMicrosoftDepth,
        ai_usage: aiUsage,
        ai_tools: aiTools.join(", "),

        // Website
        website_type: websiteType,
        has_branding: hasBranding,

        // Branding
        branding_need: brandingNeed,

        // Consultancy
        consultancy_focus: consultancyFocus,

        extra,
      },
    };

    try {
      const res = await fetch("/api/elevate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  const fieldBase =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20";
  const labelBase = "mb-2 block text-sm text-white/70";

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Premium background glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.12),transparent_55%)]" />

      <div className="relative mx-auto w-full max-w-3xl px-6 py-12">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/branding/otwoone-logo-wordmark-white.png"
              alt="OTwoOne"
              width={220}
              height={64}
              priority
            />
            <div className="hidden sm:block">
              <p className="mt-1 text-sm text-white/70">
                Tell us a little bit about what you need.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Stage 1 */}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur">
            <div className="mb-8">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-medium tracking-tight text-white">
                  How can we help you?
                </h2>
                <span className="text-xs text-white/60 border border-white/15 bg-white/5 px-2 py-1 rounded-full">
                  Step 1
                </span>
              </div>
            </div>

            {/* Need help options */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { v: "website", t: "Website" },
                  { v: "automation", t: "Automation / backend system" },
                  { v: "branding", t: "Branding" },
                  { v: "consultancy", t: "Consultancy" },
                  { v: "combo", t: "Not sure yet" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => {
                      const v = opt.v as NeedHelp;
                      setNeedHelp(v);
                      if (v !== "combo") setNotSureFocus("");
                    }}
                    className={
                      "rounded-xl border px-4 py-2.5 text-left text-sm transition-all duration-200 " +
                      (needHelp === opt.v
                        ? "border-white bg-white/15 -translate-y-[1px]"
                        : "border-white/10 bg-black/30 hover:bg-white/5 hover:border-white/20")
                    }
                  >
                    <span className={needHelp === opt.v ? "font-medium" : "font-normal"}>
                      {opt.t}
                    </span>
                  </button>
                ))}
              </div>

              {/* Not sure triage (routes into a real branch) */}
              {needHelp === "combo" && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-white/80">
                    No worries — what feels like the main priority?
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { v: "website", t: "A website" },
                      { v: "automation", t: "Automation / systems" },
                      { v: "branding", t: "Branding" },
                      { v: "consultancy", t: "Direction / consultancy" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          setNotSureFocus(opt.v as NotSureFocus);
                          setNeedHelp(opt.v as NeedHelp);
                        }}
                        className={
                          "rounded-xl border px-4 py-2.5 text-left text-sm transition-all duration-200 " +
                          (notSureFocus === opt.v
                            ? "border-white bg-white/15 -translate-y-[1px]"
                            : "border-white/10 bg-black/30 hover:bg-white/5 hover:border-white/20")
                        }
                      >
                        <span
                          className={notSureFocus === opt.v ? "font-medium" : "font-normal"}
                        >
                          {opt.t}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-white/55">
                    Pick one — you can still add more context later.
                  </p>
                </div>
              )}
            </div>

            {/* Single timing question (replacing priority + timeline) */}
            <div className="mt-8">
              <label className={labelBase}>When are you hoping to get this moving?</label>
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value as any)}
                className={fieldBase}
              >
                <option value="">Select…</option>
                <option value="asap">ASAP (2–4 weeks)</option>
                <option value="1-2">Next month or two</option>
                <option value="this_quarter">This quarter</option>
                <option value="exploring">Just exploring</option>
              </select>
            </div>

            {/* Name + Email */}
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className={labelBase}>Name</label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  name="contact_name"
                  placeholder="Your name"
                  className={fieldBase}
                  required
                />
              </div>
              <div>
                <label className={labelBase}>Email</label>
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  name="contact_email"
                  placeholder="you@company.com"
                  className={fieldBase}
                  required
                />
              </div>
            </div>

            {/* Continue */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  if (!stage1IsValid()) return;
                  setStage(2);
                  setTimeout(() => {
                    document.getElementById("stage-2")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }, 50);
                }}
                className="inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold tracking-wide text-black shadow-lg transition hover:-translate-y-[1px] hover:bg-white/90 hover:shadow-xl disabled:opacity-50"
                disabled={status === "sending"}
              >
                Continue →
              </button>
            </div>
          </section>

          {/* Stage 2 */}
          {stage === 2 && (
            <section
              id="stage-2"
              className="animate-fade-in rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold tracking-tight">Details</h2>
                <p className="mt-1 text-sm text-white/70">
                  A little more detail so we can guide you properly.
                </p>
              </div>

              <div className="space-y-6">
                {/* Always visible */}
                <div>
                  <label className={labelBase}>What are you trying to achieve?</label>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    name="goal"
                    placeholder="Briefly describe the outcome you want…"
                    className={fieldBase}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className={labelBase}>Company</label>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      name="company_name"
                      placeholder="Company name"
                      className={fieldBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Website</label>
                    <input
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      name="company_website"
                      placeholder="company.com"
                      className={fieldBase}
                    />
                  </div>
                </div>

                {/* Breakdown (Automation / Consultancy) */}
                {showBreakdown && (
                  <div>
                    <label className={labelBase}>Where does work break down most?</label>
                    <select
                      value={breakdown}
                      onChange={(e) => setBreakdown(e.target.value as any)}
                      className={fieldBase}
                    >
                      <option value="">Select…</option>
                      <option value="leads">Leads & enquiries</option>
                      <option value="quoting">Quoting / proposals</option>
                      <option value="delivery">Delivery / project management</option>
                      <option value="finance">Invoicing / finance</option>
                      <option value="comms">Internal communication</option>
                      <option value="reporting">Reporting / visibility</option>
                      <option value="no_process">We don’t have defined processes</option>
                    </select>
                  </div>
                )}

                {/* Automation / Systems */}
                {showToolsSection && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                    <h3 className="text-sm font-semibold text-white/80">
                      Current tools & platforms
                    </h3>
                    <p className="mt-1 text-xs text-white/60">
                      This helps us design around what you already use (Microsoft-first, but tool-flexible).
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className={labelBase}>Core platform</label>
                        <select
                          value={toolsCore}
                          onChange={(e) => setToolsCore(e.target.value as any)}
                          className={fieldBase}
                        >
                          <option value="">Select…</option>
                          <option value="m365">Microsoft 365</option>
                          <option value="google">Google Workspace</option>
                          <option value="mixed">Mixed tools</option>
                          <option value="unknown">Not sure</option>
                        </select>

                        {toolsCore === "m365" && (
                          <div className="mt-4">
                            <label className={labelBase}>Microsoft usage level</label>
                            <select
                              value={toolsMicrosoftDepth}
                              onChange={(e) => setToolsMicrosoftDepth(e.target.value as any)}
                              className={fieldBase}
                            >
                              <option value="">Select…</option>
                              <option value="basic">Basic email + files</option>
                              <option value="teams_sp">Teams & SharePoint in use</option>
                              <option value="some_auto">Some automation</option>
                              <option value="underused">We’re underutilising it</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={labelBase}>AI usage</label>
                        <select
                          value={aiUsage}
                          onChange={(e) => setAiUsage(e.target.value as any)}
                          className={fieldBase}
                        >
                          <option value="">Select…</option>
                          <option value="no">Not using AI</option>
                          <option value="experimenting">Experimenting</option>
                          <option value="weekly">Using weekly</option>
                          <option value="copilot">Using Microsoft Copilot</option>
                          <option value="structured">Want structured AI rollout</option>
                        </select>

                        {aiUsage && aiUsage !== "no" && (
                          <div className="mt-4">
                            <label className={labelBase}>AI tools (select all)</label>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {[
                                "ChatGPT",
                                "Microsoft Copilot",
                                "Claude",
                                "Gemini",
                                "Perplexity",
                                "Built-in AI (Canva/Notion/etc.)",
                                "Other",
                              ].map((t) => (
                                <label
                                  key={t}
                                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={aiTools.includes(t)}
                                    onChange={() => setAiTools((prev) => toggleArrayValue(prev, t))}
                                  />
                                  <span className="text-white/80">{t}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Website */}
                {showWebsiteSection && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                    <h3 className="text-sm font-semibold text-white/80">Website scope</h3>

                    <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className={labelBase}>Website type</label>
                        <select
                          value={websiteType}
                          onChange={(e) => setWebsiteType(e.target.value as any)}
                          className={fieldBase}
                        >
                          <option value="">Select…</option>
                          <option value="landing">Landing page</option>
                          <option value="multi">Multi-page website</option>
                          <option value="ecommerce">E-commerce</option>
                          <option value="redesign">Redesign existing site</option>
                          <option value="notsure">Not sure</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelBase}>Do you have branding?</label>
                        <select
                          value={hasBranding}
                          onChange={(e) => setHasBranding(e.target.value as any)}
                          className={fieldBase}
                        >
                          <option value="">Select…</option>
                          <option value="yes">Yes</option>
                          <option value="partial">Partially</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Branding */}
                {showBrandingSection && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                    <h3 className="text-sm font-semibold text-white/80">Branding</h3>

                    <div className="mt-4">
                      <label className={labelBase}>What do you need?</label>
                      <select
                        value={brandingNeed}
                        onChange={(e) => setBrandingNeed(e.target.value as any)}
                        className={fieldBase}
                      >
                        <option value="">Select…</option>
                        <option value="logo">Logo design</option>
                        <option value="identity">Full brand identity</option>
                        <option value="rebrand">Rebrand / refresh</option>
                        <option value="strategy_messaging">Strategy & messaging</option>
                        <option value="notsure">Not sure</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Consultancy */}
                {showConsultancySection && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                    <h3 className="text-sm font-semibold text-white/80">Consultancy focus</h3>
                    <p className="mt-1 text-xs text-white/60">
                      Pick the closest fit — we can refine it together.
                    </p>

                    <div className="mt-4">
                      <label className={labelBase}>What kind of support do you want?</label>
                      <select
                        value={consultancyFocus}
                        onChange={(e) => setConsultancyFocus(e.target.value as any)}
                        className={fieldBase}
                      >
                        <option value="">Select…</option>
                        <option value="strategy">Strategy / direction</option>
                        <option value="operations">Operations / ways of working</option>
                        <option value="training">Training & enablement</option>
                        <option value="growth">Growth roadmap</option>
                        <option value="all">A mix of the above</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Budget */}
                <div>
                  <label className={labelBase}>Estimated budget range</label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value as any)}
                    className={fieldBase}
                  >
                    <option value="">Select…</option>
                    <option value="under3">Under €3k</option>
                    <option value="3-7">€3k–€7k</option>
                    <option value="7-15">€7k–€15k</option>
                    <option value="15-30">€15k–€30k</option>
                    <option value="30plus">€30k+</option>
                  </select>
                </div>

                <div>
                  <label className={labelBase}>Anything else we should know?</label>
                  <textarea
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    className={fieldBase}
                    rows={3}
                    placeholder="Links, context, constraints, deadlines…"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {status === "sending" ? "Sending…" : "Submit"}
                </button>

                {status === "done" && (
                  <p className="text-green-400">Submitted successfully ✅</p>
                )}
                {status === "error" && (
                  <p className="text-red-400">Submission failed ❌</p>
                )}
              </div>
            </section>
          )}
        </form>

        {/* Fade animation */}
        <style jsx global>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fadeIn 0.4s ease forwards;
          }
        `}</style>
      </div>
    </main>
  );
}