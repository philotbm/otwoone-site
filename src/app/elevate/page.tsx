"use client";

import React, { FormEvent, useMemo, useState } from "react";

type Status = "idle" | "sending" | "done" | "error";
type ServiceKey = "website" | "branding" | "automation" | "strategy";

type ServiceDef = {
  key: ServiceKey;
  label: string;
  desc: string;
};

const SERVICES: ServiceDef[] = [
  { key: "website", label: "Website", desc: "A site that looks great and converts." },
  { key: "branding", label: "Branding", desc: "Identity, logo, and visual consistency." },
  { key: "automation", label: "Automation & Systems", desc: "Reduce manual work. Improve operations." },
  { key: "strategy", label: "Strategy", desc: "Clarity, direction, and a plan you can execute." },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeWebsite(website: string) {
  const raw = (website || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export default function ElevatePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");

  // Services (multi-select) + primary
  const [selectedServices, setSelectedServices] = useState<ServiceKey[]>(["website"]);
  const [primaryService, setPrimaryService] = useState<ServiceKey>("website");

  // Core details
  const [budget, setBudget] = useState("");
  const [timing, setTiming] = useState("");
  const [extra, setExtra] = useState("");

  // Website details
  const [websiteType, setWebsiteType] = useState("");
  const [websitePages, setWebsitePages] = useState("");
  const [ecommerceNeeded, setEcommerceNeeded] = useState("");
  const [contentReady, setContentReady] = useState("");

  // Branding details
  const [hasBranding, setHasBranding] = useState("");
  const [brandingNeed, setBrandingNeed] = useState("");

  // Automation details (keep tool-flexible; not MS-heavy)
  const [systemNeed, setSystemNeed] = useState("");
  const [aiTools, setAiTools] = useState("");
  const [toolsCore, setToolsCore] = useState("");

  // Strategy details
  const [consultancyFocus, setConsultancyFocus] = useState("");

  const selectedSet = useMemo(() => new Set(selectedServices), [selectedServices]);

  const primaryOptions = useMemo(() => {
    return SERVICES.filter((s) => selectedSet.has(s.key));
  }, [selectedSet]);

  function toggleService(key: ServiceKey) {
    setSelectedServices((prev) => {
      const exists = prev.includes(key);
      const next: ServiceKey[] = exists ? prev.filter((k) => k !== key) : [...prev, key];

      // never allow zero selected (keep it simple)
      const safeNext: ServiceKey[] = next.length ? next : ["website"];

      // keep primary valid
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

    if (!email.trim()) {
      setStatus("error");
      setErrorMsg("Please enter an email so we can reply.");
      return;
    }

    // Build answers object compatible with your route.ts (v2 + a light v1 string)
    const answers: Record<string, any> = {
      services: selectedServices,
      primary_service: primaryService,

      budget: budget || undefined,
      timing: timing || undefined,
      extra: extra || undefined,

      // website details (only include if relevant)
      website: selectedSet.has("website")
        ? {
            type: websiteType || undefined,
            pages: websitePages || undefined,
            ecommerce: ecommerceNeeded || undefined,
            content_ready: contentReady || undefined,
          }
        : undefined,

      // branding details
      branding: selectedSet.has("branding")
        ? {
            has_branding: hasBranding || undefined,
            need: brandingNeed || undefined,
          }
        : undefined,

      // systems/automation details
      system_need: selectedSet.has("automation") ? systemNeed || undefined : undefined,

      // tooling signals (optional)
      ai_tools: aiTools || undefined,
      tools_core: toolsCore || undefined,

      // strategy focus
      consultancy_focus: selectedSet.has("strategy") ? consultancyFocus || undefined : undefined,

      // backwards-compatible v1 field (your route supports v1 + v2)
      need_help: selectedServices
        .map((s) => (s === "automation" ? "automation / backend system" : s))
        .join(", "),
    };

    try {
      const res = await fetch("/api/elevate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: name,
          contact_email: email,
          company_name: company,
          company_website: normalizeWebsite(website),
          answers,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Submission failed");

      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Something went wrong.");
    }
  }

  const pageShell =
    "min-h-screen bg-[#05060a] text-white relative overflow-x-hidden";
  const bgGlow =
    "absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-40 bg-gradient-to-b from-indigo-600/35 via-slate-900/0 to-slate-900/0 pointer-events-none";
  const container = "relative mx-auto w-full max-w-5xl px-6 py-14";

  const card =
    "rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur";
  const innerCard = "rounded-2xl border border-white/10 bg-white/[0.02]";

  const label = "text-sm text-white/70";
  const input =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-indigo-500/40";
  const select =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/40";
  const textarea =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[110px]";

  const serviceTileBase =
    "relative rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-left transition";
  const serviceTileOn =
    "border-indigo-400/40 bg-indigo-500/20 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]";
  const serviceTitle = "text-base font-semibold";
  const serviceDesc = "mt-1 text-sm text-white/65";

  const pill =
    "absolute right-4 top-4 grid place-items-center h-5 w-5 rounded-full border border-white/15";
  const pillOn = "bg-indigo-500 border-indigo-400/60";

  return (
    <div className={pageShell}>
      <div className={bgGlow} />

      <div className={container}>
        {/* Header */}
        <div className="mb-10 flex items-start gap-6">
          <div className="pt-1">
            {/* keep your existing logo path (you have these in /public/branding) */}
            <img
              src="/branding/otwoone-logo.png"
              alt="OTwoOne"
              className="h-12 w-auto opacity-90"
            />
          </div>

          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Tell us what you need —
              <br />
              <span className="text-indigo-400 font-semibold">
                we’ll shape the right plan around you.
              </span>
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={cx(card, "p-6 md:p-8")}>
          {/* Contact fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className={label}>Name</div>
              <input
                className={input}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <div className={label}>
                Email <span className="text-indigo-300">*</span>
              </div>
              <input
                className={input}
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className={label}>Company</div>
              <input
                className={input}
                placeholder="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div>
              <div className={label}>Website</div>
              <input
                className={input}
                placeholder="example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>

          {/* Services */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold">What do you want help with?</h2>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {SERVICES.map((s) => {
                const on = selectedSet.has(s.key);
                return (
                  <button
                    type="button"
                    key={s.key}
                    onClick={() => toggleService(s.key)}
                    className={cx(serviceTileBase, on && serviceTileOn)}
                  >
                    <div className={cx(pill, on && pillOn)} />
                    <div className={serviceTitle}>{s.label}</div>
                    <div className={serviceDesc}>{s.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className={cx(innerCard, "mt-5 p-5")}>
              <div className="text-sm font-semibold text-white/90">
                Which one is the main priority?
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {primaryOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 cursor-pointer",
                      primaryService === opt.key &&
                        "border-indigo-400/40 bg-indigo-500/10"
                    )}
                  >
                    <input
                      type="radio"
                      name="primary"
                      className="h-4 w-4"
                      checked={primaryService === opt.key}
                      onChange={() => setPrimaryService(opt.key)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Quick details */}
          <div className="mt-10">
            <h2 className="text-2xl font-semibold">A few quick details</h2>
            <p className="mt-2 text-sm text-white/60">
              This helps us respond faster and more accurately.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className={label}>Budget</div>
                <select className={select} value={budget} onChange={(e) => setBudget(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="Under €3k">Under €3k</option>
                  <option value="€3k–€7k">€3k–€7k</option>
                  <option value="€7k–€15k">€7k–€15k</option>
                  <option value="€15k+">€15k+</option>
                </select>
              </div>

              <div>
                <div className={label}>Timing</div>
                <select className={select} value={timing} onChange={(e) => setTiming(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="ASAP (2–4 weeks)">ASAP (2–4 weeks)</option>
                  <option value="Soon (1–2 months)">Soon (1–2 months)</option>
                  <option value="This quarter (3 months)">This quarter (3 months)</option>
                  <option value="Not sure yet">Not sure yet</option>
                </select>
              </div>

              {/* Website-specific */}
              {selectedSet.has("website") && (
                <>
                  <div>
                    <div className={label}>Website type</div>
                    <select
                      className={select}
                      value={websiteType}
                      onChange={(e) => setWebsiteType(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="landing">Landing page</option>
                      <option value="multi">Multi-page website</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="not_sure">Not sure yet</option>
                    </select>
                  </div>

                  <div>
                    <div className={label}>Approx size</div>
                    <select
                      className={select}
                      value={websitePages}
                      onChange={(e) => setWebsitePages(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="2_5">2–5 pages</option>
                      <option value="6_10">6–10 pages</option>
                      <option value="10_plus">10+ pages</option>
                      <option value="not_sure">Not sure yet</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className={label}>E-commerce needed?</div>
                    <select
                      className={select}
                      value={ecommerceNeeded}
                      onChange={(e) => setEcommerceNeeded(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="not_sure">Not sure</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className={label}>Do you have content ready?</div>
                    <select
                      className={select}
                      value={contentReady}
                      onChange={(e) => setContentReady(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="yes_mostly">Yes (mostly ready)</option>
                      <option value="some">Some of it</option>
                      <option value="none">No (need help)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Branding-specific */}
              {selectedSet.has("branding") && (
                <>
                  <div>
                    <div className={label}>Do you have branding already?</div>
                    <select
                      className={select}
                      value={hasBranding}
                      onChange={(e) => setHasBranding(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="yes">Yes</option>
                      <option value="partial">Partially</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <div className={label}>Branding needs</div>
                    <select
                      className={select}
                      value={brandingNeed}
                      onChange={(e) => setBrandingNeed(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="logo">Logo only</option>
                      <option value="identity">Identity (logo + colours + typography)</option>
                      <option value="refresh">Refresh existing brand</option>
                      <option value="assets">Social / marketing assets</option>
                      <option value="not_sure">Not sure yet</option>
                    </select>
                  </div>
                </>
              )}

              {/* Automation-specific */}
              {selectedSet.has("automation") && (
                <div className="md:col-span-2">
                  <div className={label}>What’s the core system need?</div>
                  <select
                    className={select}
                    value={systemNeed}
                    onChange={(e) => setSystemNeed(e.target.value)}
                  >
                    <option value="">Select…</option>
                    <option value="crm">CRM / pipeline</option>
                    <option value="ops">Operations workflow</option>
                    <option value="forms">Forms + automation</option>
                    <option value="reporting">Reporting / dashboards</option>
                    <option value="integrations">Tool integrations</option>
                    <option value="not_sure">Not sure yet</option>
                  </select>
                </div>
              )}

              {/* Tooling (always optional; keep it tool-flexible) */}
              <div>
                <div className={label}>AI tools involved?</div>
                <select className={select} value={aiTools} onChange={(e) => setAiTools(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="none">None</option>
                  <option value="some">Some (ChatGPT / Copilot / other)</option>
                  <option value="heavy">Heavily AI-driven</option>
                </select>
              </div>

              <div>
                <div className={label}>Current tools (optional)</div>
                <select className={select} value={toolsCore} onChange={(e) => setToolsCore(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="m365">Microsoft 365 / Outlook</option>
                  <option value="google">Google Workspace</option>
                  <option value="asana">Asana</option>
                  <option value="trello">Trello</option>
                  <option value="notion">Notion</option>
                  <option value="slack">Slack</option>
                  <option value="mixed">Mixed / not sure</option>
                </select>
              </div>

              {/* Strategy-specific */}
              {selectedSet.has("strategy") && (
                <div className="md:col-span-2">
                  <div className={label}>Strategy focus</div>
                  <select
                    className={select}
                    value={consultancyFocus}
                    onChange={(e) => setConsultancyFocus(e.target.value)}
                  >
                    <option value="">Select…</option>
                    <option value="positioning">Positioning / offer clarity</option>
                    <option value="pricing">Pricing / packaging</option>
                    <option value="go_to_market">Go-to-market plan</option>
                    <option value="process">Process / operating model</option>
                    <option value="not_sure">Not sure yet</option>
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <div className={label}>Anything else we should know?</div>
                <textarea
                  className={textarea}
                  placeholder="Optional — links, context, goals, what success looks like…"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-10 flex items-center justify-between gap-4">
            <div className="text-xs text-white/45">
              By submitting, you’re asking OTwoOne to review your request and reply by email.
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className={cx(
                "rounded-xl px-6 py-3 text-sm font-semibold",
                status === "sending"
                  ? "bg-white/10 text-white/60 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90"
              )}
            >
              {status === "sending" ? "Submitting…" : "Submit"}
            </button>
          </div>

          {status === "done" && (
            <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Submitted. We’ll review your details and reply shortly.
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMsg || "Something went wrong."}
            </div>
          )}
        </form>

        <div className="mt-10 text-center text-xs text-white/30">
          OTwoOne, Cork, Ireland · www.otwoone.ie
        </div>
      </div>
    </div>
  );
}