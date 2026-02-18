"use client";

import React, { FormEvent, useMemo, useState } from "react";

type Status = "idle" | "sending" | "done" | "error";
type ServiceKey = "website" | "branding" | "automation" | "strategy";

const SERVICES: Array<{ key: ServiceKey; label: string; desc: string }> = [
  {
    key: "website",
    label: "Website",
    desc: "A site that looks great and converts.",
  },
  {
    key: "branding",
    label: "Branding",
    desc: "Identity, logo, and visual consistency.",
  },
  {
    key: "automation",
    label: "Automation & Systems",
    desc: "Reduce manual work. Improve operations.",
  },
  {
    key: "strategy",
    label: "Strategy",
    desc: "Clarity, direction, and a plan you can execute.",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ensureHttps(raw: string) {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export default function ElevatePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");

  const [selectedServices, setSelectedServices] = useState<ServiceKey[]>(["website"]);
  const [primaryService, setPrimaryService] = useState<ServiceKey>("website");

  const [budget, setBudget] = useState("");
  const [timing, setTiming] = useState("");

  const [websiteType, setWebsiteType] = useState("");
  const [websitePages, setWebsitePages] = useState("");
  const [ecommerce, setEcommerce] = useState("");
  const [contentReady, setContentReady] = useState("");

  const [hasBranding, setHasBranding] = useState("");
  const [brandingNeed, setBrandingNeed] = useState("");

  const [systemNeed, setSystemNeed] = useState("");
  const [aiTools, setAiTools] = useState("");
  const [toolsCore, setToolsCore] = useState("");

  const [extra, setExtra] = useState("");

  const selectedSet = useMemo(() => new Set(selectedServices), [selectedServices]);

  function toggleService(key: ServiceKey) {
    setSelectedServices((prev) => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];
      return next.length ? next : ["website"];
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

    const answers: Record<string, any> = {
      services: selectedServices,
      primary_service: primaryService,
      budget,
      timing,
      extra,
    };

    if (selectedSet.has("website")) {
      answers.website = {
        type: websiteType,
        pages: websitePages,
        ecommerce,
        content_ready: contentReady,
      };
    }

    if (selectedSet.has("branding")) {
      answers.branding = {
        has_branding: hasBranding,
        need: brandingNeed,
      };
    }

    if (selectedSet.has("automation")) {
      answers.system_need = systemNeed;
      answers.ai_tools = aiTools;
      answers.tools_core = toolsCore;
    }

    answers.need_help = selectedServices.join(", ");

    try {
      const res = await fetch("/api/elevate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: name,
          contact_email: email,
          company_name: company,
          company_website: ensureHttps(website),
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] to-black text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="mb-12">
          <img
            src="/branding/otwoone-logo-black.png"
            alt="OTwoOne"
            className="h-14 mb-6"
          />

          <h1 className="text-3xl font-semibold tracking-tight">
            Tell us what you need —
            <span className="block text-indigo-400 mt-2">
              we’ll shape the right plan around you.
            </span>
          </h1>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-12">

          {/* CONTACT */}
          <div className="grid md:grid-cols-2 gap-6">
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="input"
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              className="input"
              placeholder="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {/* SERVICES */}
          <div>
            <h2 className="text-xl font-semibold mb-4">What do you want help with?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {SERVICES.map((s) => (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => toggleService(s.key)}
                  className={cx(
                    "rounded-xl p-5 border text-left transition",
                    selectedSet.has(s.key)
                      ? "bg-indigo-600 border-indigo-500"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="font-semibold">{s.label}</div>
                  <div className="text-sm opacity-70">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* DETAILS */}
          <div>
            <h2 className="text-xl font-semibold mb-6">A few quick details</h2>

            <div className="grid md:grid-cols-2 gap-6">

              <select className="input" value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Budget</option>
                <option>Under €3k</option>
                <option>€3k–€7k</option>
                <option>€7k–€15k</option>
                <option>€15k+</option>
              </select>

              <select className="input" value={timing} onChange={(e) => setTiming(e.target.value)}>
                <option value="">Timing</option>
                <option>ASAP (2–4 weeks)</option>
                <option>Soon (1–2 months)</option>
                <option>Flexible</option>
              </select>

              {selectedSet.has("website") && (
                <>
                  <select className="input" value={websiteType} onChange={(e) => setWebsiteType(e.target.value)}>
                    <option value="">Website type</option>
                    <option>Landing page</option>
                    <option>Multi-page website</option>
                    <option>E-commerce</option>
                  </select>

                  <select className="input" value={websitePages} onChange={(e) => setWebsitePages(e.target.value)}>
                    <option value="">Approx size</option>
                    <option>2–5 pages</option>
                    <option>6–10 pages</option>
                    <option>10+ pages</option>
                  </select>
                </>
              )}

              {selectedSet.has("branding") && (
                <>
                  <select className="input" value={hasBranding} onChange={(e) => setHasBranding(e.target.value)}>
                    <option value="">Do you have branding already?</option>
                    <option>No</option>
                    <option>Partially</option>
                    <option>Yes</option>
                  </select>

                  <select className="input" value={brandingNeed} onChange={(e) => setBrandingNeed(e.target.value)}>
                    <option value="">Branding needs</option>
                    <option>Logo only</option>
                    <option>Full identity</option>
                    <option>Brand refresh</option>
                  </select>
                </>
              )}
            </div>

            <textarea
              className="input mt-6"
              placeholder="Anything else we should know?"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </div>

          {status === "error" && (
            <div className="text-red-400">{errorMsg}</div>
          )}

          {status === "done" ? (
            <div className="text-green-400">
              Thanks — we’ll review this and reply shortly.
            </div>
          ) : (
            <button
              type="submit"
              disabled={status === "sending"}
              className="bg-white text-black px-6 py-3 rounded-lg font-semibold"
            >
              {status === "sending" ? "Submitting..." : "Submit"}
            </button>
          )}
        </form>
      </div>

      <style jsx>{`
        .input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          color: white;
          width: 100%;
        }
        select.input option {
          color: black;
        }
      `}</style>
    </div>
  );
}