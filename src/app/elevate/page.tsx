"use client";

import { FormEvent, useMemo, useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

type ServiceKey = "website" | "branding" | "automation" | "strategy";

const SERVICES: Array<{
  key: ServiceKey;
  label: string;
  desc: string;
}> = [
  { key: "website", label: "Website", desc: "A site that looks great and converts." },
  { key: "branding", label: "Branding", desc: "Identity, logo, and visual consistency." },
  { key: "automation", label: "Automation & Systems", desc: "Reduce manual work. Improve operations." },
  { key: "strategy", label: "Strategy", desc: "Clarity, direction, and a plan you can execute." },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default function ElevatePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");

  // Services
  const [selectedServices, setSelectedServices] = useState<ServiceKey[]>(["website"]);
  const [primaryService, setPrimaryService] = useState<ServiceKey>("website");

  // Common
  const [budget, setBudget] = useState("");
  const [timing, setTiming] = useState("");

  // Website
  const [websiteType, setWebsiteType] = useState("");
  const [websitePages, setWebsitePages] = useState("");
  const [ecommerceNeeded, setEcommerceNeeded] = useState("");
  const [contentReady, setContentReady] = useState("");

  // Branding
  const [hasBranding, setHasBranding] = useState("");
  const [brandingNeed, setBrandingNeed] = useState("");

  // Systems / Automation
  const [systemNeed, setSystemNeed] = useState("");

  // AI + tools
  const [aiTools, setAiTools] = useState("");
  const [toolsCore, setToolsCore] = useState("");

  // Free text
  const [extra, setExtra] = useState("");

  const selectedSet = useMemo(() => new Set(selectedServices), [selectedServices]);

  const primaryOptions = useMemo(() => {
    // Only show radios for selected services
    return SERVICES.filter((s) => selectedSet.has(s.key));
  }, [selectedSet]);

  function toggleService(key: ServiceKey) {
    setSelectedServices((prev) => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];

      // Ensure we never end up with zero selected
      const safeNext: ServiceKey[] = (next.length ? next : ["website"]) as ServiceKey[];

      // If primary no longer valid, pick first selected
      if (!safeNext.includes(primaryService)) {
        setPrimaryService(safeNext[0]);
      }

      return safeNext;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setStatus("sending");

    // Minimal validation
    if (!email.trim()) {
      setStatus("error");
      setErrorMsg("Please enter an email so we can reply.");
      return;
    }

    // Build answers payload (kept simple + compatible with your quote engine)
    const answers: Record<string, any> = {
      // v2
      services: selectedServices,
      primary_service: primaryService,

      // common
      budget,
      timing,
      extra,

      // website (v2-style bucket)
      website: {
        type: websiteType || undefined,
        pages: websitePages || undefined,
        ecommerce: ecommerceNeeded || undefined,
        content_ready: contentReady || undefined,
      },

      // branding (v2-style bucket)
      branding: {
        // you can map this later to refresh/full_identity if you want
        has_branding: hasBranding || undefined,
        need: brandingNeed || undefined,
      },

      // systems/automation
      system_need: systemNeed || undefined,

      // tooling signals
      ai_tools: aiTools || undefined,
      tools_core: toolsCore || undefined,
    };

    // Also include a simple v1-ish field for backwards compatibility (optional)
    // (your route.ts already handles v1 + v2)
    answers.need_help = selectedServices
      .map((s) => (s === "automation" ? "automation / backend system" : s))
      .join(", ");

    try {
      const res = await fetch("/api/elevate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: name,
          contact_email: email,
          company_name: company,
          company_website: website,
          answers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Submission failed");
      }

      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Something went wrong.");
    }
  }

  const showWebsite = selectedSet.has("website");
  const showBranding = selectedSet.has("branding");
  const showAutomation = selectedSet.has("automation");
  const showStrategy = selectedSet.has("strategy");

  return (
    <div className="min-h-screen bg-black">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_400px_at_25%_15%,rgba(59,130,246,0.28),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_350px_at_70%_20%,rgba(99,102,241,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_95%,rgba(15,23,42,0.6),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/branding/otwoone-logo.png"
              alt="OTwoOne"
              className="h-12 w-auto md:h-14"
            />
          </div>

          <div className="pt-2 text-white/90">
            <div className="text-sm md:text-base">
              You can choose more than one — we’ll shape the best plan for you.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contact card */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-white/70">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">
                  Email <span className="text-white/60">*</span>
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Company</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Website</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="example.com"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
              </div>
            </div>
          </section>

          {/* Services */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="mb-4">
              <div className="text-lg font-semibold text-white">
                What do you want help with? <span className="text-white/60">*</span>
              </div>
              <div className="mt-1 text-sm text-white/60">You can choose more than one.</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {SERVICES.map((s) => {
                const active = selectedSet.has(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleService(s.key)}
                    className={cx(
                      "group relative rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-white/20 bg-white/10"
                        : "border-white/10 bg-black/25 hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-white">{s.label}</div>
                        <div className="mt-1 text-sm text-white/60">{s.desc}</div>
                      </div>

                      <div
                        className={cx(
                          "mt-1 h-5 w-5 rounded-full border transition",
                          active ? "border-white/60 bg-white/15" : "border-white/20"
                        )}
                      >
                        {active ? (
                          <div className="m-[4px] h-3 w-3 rounded-full bg-white/80" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm font-semibold text-white">
                Which one is the main priority?{" "}
                <span className="text-white/50">
                  (currently:{" "}
                  {SERVICES.find((s) => s.key === primaryService)?.label ?? "—"})
                </span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {primaryOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white/90 hover:border-white/20"
                  >
                    <input
                      type="radio"
                      name="primary_service"
                      value={opt.key}
                      checked={primaryService === opt.key}
                      onChange={() => setPrimaryService(opt.key)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Quick details */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="mb-4">
              <div className="text-lg font-semibold text-white">A few quick details</div>
              <div className="mt-1 text-sm text-white/60">
                This helps us respond faster and more accurately.
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-white/70">Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="">Select…</option>
                  <option value="Under €3k">Under €3k</option>
                  <option value="€3k–€5k">€3k–€5k</option>
                  <option value="€5k–€10k">€5k–€10k</option>
                  <option value="€10k–€15k">€10k–€15k</option>
                  <option value="€15k+">€15k+</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/70">Timing</label>
                <select
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="">Select…</option>
                  <option value="ASAP (2–4 weeks)">ASAP (2–4 weeks)</option>
                  <option value="Soon (1–2 months)">Soon (1–2 months)</option>
                  <option value="This quarter">This quarter</option>
                  <option value="No rush">No rush</option>
                </select>
              </div>

              {/* Website fields */}
              {showWebsite && (
                <>
                  <div>
                    <label className="text-sm text-white/70">Website type</label>
                    <select
                      value={websiteType}
                      onChange={(e) => setWebsiteType(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">Select…</option>
                      <option value="landing">Landing page</option>
                      <option value="multi">Multi-page website</option>
                      <option value="ecom">E-commerce</option>
                      <option value="not_sure">Not sure yet</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-white/70">Approx size</label>
                    <select
                      value={websitePages}
                      onChange={(e) => setWebsitePages(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">Select…</option>
                      <option value="2_5">2–5 pages</option>
                      <option value="6_10">6–10 pages</option>
                      <option value="10_plus">10+ pages</option>
                      <option value="not_sure">Not sure yet</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm text-white/70">E-commerce needed?</label>
                    <select
                      value={ecommerceNeeded}
                      onChange={(e) => setEcommerceNeeded(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">Select…</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="not_sure">Not sure yet</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm text-white/70">Do you have content ready?</label>
                    <select
                      value={contentReady}
                      onChange={(e) => setContentReady(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">Select…</option>
                      <option value="ready">Yes (mostly ready)</option>
                      <option value="some">Some of it</option>
                      <option value="none">No (need help)</option>
                      <option value="not_sure">Not sure yet</option>
                    </select>
                  </div>
                </>
              )}

              {/* Branding fields */}
              {showBranding && (
                <>
                  <div>
                    <label className="text-sm text-white/70">Do you have branding already?</label>
                    <select
                      value={hasBranding}
                      onChange={(e) => setHasBranding(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">Select…</option>
                      <option value="yes">Yes</option>
                      <option value="partial">Partially</option>
                      <option value="no">No</option>
                      <option value="not_sure">Not sure</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-white/70">Branding needs</label>
                    <select
                      value={brandingNeed}
                      onChange={(e) => setBrandingNeed(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="">Select…</option>
                      <option value="logo">Logo</option>
                      <option value="identity">Identity (logo + colours + typography)</option>
                      <option value="refresh">Brand refresh</option>
                      <option value="social">Social templates</option>
                      <option value="not_sure">Not sure yet</option>
                    </select>
                  </div>
                </>
              )}

              {/* Automation fields */}
              {showAutomation && (
                <div className="md:col-span-2">
                  <label className="text-sm text-white/70">What’s the core system need?</label>
                  <select
                    value={systemNeed}
                    onChange={(e) => setSystemNeed(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Select…</option>
                    <option value="crm">CRM / pipeline</option>
                    <option value="forms">Forms → automation</option>
                    <option value="reporting">Reporting / dashboards</option>
                    <option value="integrations">Integrations (tools talking to each other)</option>
                    <option value="ai">AI / assistants</option>
                    <option value="not_sure">Not sure yet</option>
                  </select>
                </div>
              )}

              {/* Strategy fields (simple) */}
              {showStrategy && (
                <div className="md:col-span-2">
                  <label className="text-sm text-white/70">Strategy focus</label>
                  <select
                    value={""} // keep minimal; you can add a state later if you want
                    onChange={() => {}}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Select…</option>
                    <option value="positioning">Positioning & messaging</option>
                    <option value="offer">Offer / packages</option>
                    <option value="process">Process & operations</option>
                    <option value="growth">Growth plan</option>
                    <option value="not_sure">Not sure yet</option>
                  </select>
                </div>
              )}

              {/* Tooling (not MS-heavy) */}
              <div>
                <label className="text-sm text-white/70">AI tools involved?</label>
                <select
                  value={aiTools}
                  onChange={(e) => setAiTools(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="">Select…</option>
                  <option value="none">None</option>
                  <option value="some">Some / exploring</option>
                  <option value="yes">Yes (actively using AI)</option>
                  <option value="not_sure">Not sure</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/70">Current tools (optional)</label>
                <select
                  value={toolsCore}
                  onChange={(e) => setToolsCore(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/20"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="">Select…</option>
                  <option value="m365">Microsoft 365 / Outlook</option>
                  <option value="google">Google Workspace / Gmail</option>
                  <option value="mixed">Mixed (a bit of everything)</option>
                  <option value="unsure">Not sure / hasn’t been decided</option>
                  <option value="other">Other / tell us in the notes</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-white/70">Anything else we should know?</label>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={4}
                  placeholder="Optional — links, context, goals, what success looks like…"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="text-xs text-white/40">
                By submitting, you’re asking OTwoOne to review your request and reply by email.
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className={cx(
                  "rounded-xl px-6 py-3 text-sm font-semibold transition",
                  status === "sending"
                    ? "bg-white/20 text-white/60"
                    : "bg-white text-black hover:bg-white/90"
                )}
              >
                {status === "sending" ? "Submitting…" : "Submit"}
              </button>
            </div>

            {status === "error" && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {errorMsg || "Something went wrong."}
              </div>
            )}

            {status === "done" && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                Received — thank you. We’ll reply within 2 business days.
              </div>
            )}
          </section>

          <div className="pb-6 text-center text-xs text-white/30">
            OTwoOne, Cork, Ireland • www.otwoone.ie
          </div>
        </form>
      </div>
    </div>
  );
}