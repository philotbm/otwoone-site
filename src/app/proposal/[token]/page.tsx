"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ── Types (client-safe subset) ──────────────────────────────────────────────

type ScopeItem = { label: string; description?: string };
type Deliverable = { label: string; description?: string };
type TimelinePhase = { phase: string; duration: string; description?: string };
type RunningCostItem = { name: string; low: number; high: number; relevance: string };

type ClientProposal = {
  id: string;
  version_number: number;
  status: string;
  title: string | null;
  client_name: string | null;
  client_company: string | null;
  prepared_for: string | null;
  prepared_by: string | null;
  proposal_date: string | null;
  valid_until: string | null;
  executive_summary: string | null;
  problem_statement: string | null;
  recommended_solution: string | null;
  scope_items: ScopeItem[];
  deliverables: Deliverable[];
  timeline_summary: string | null;
  timeline_phases: TimelinePhase[];
  build_price: number | null;
  deposit_percent: number | null;
  deposit_amount: number | null;
  balance_amount: number | null;
  balance_terms: string | null;
  running_costs: RunningCostItem[];
  assumptions: string[];
  exclusions: string[];
  next_steps: string[];
  payment_notes: string | null;
  acceptance_mode: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtCurrency(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `€${Number(n).toLocaleString("en-IE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ── Section component ────────────────────────────────────────────────────────

function Section({
  id,
  number,
  title,
  children,
}: {
  id?: string;
  number?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 sm:mb-16">
      <div className="flex items-baseline gap-3 mb-4">
        {number !== undefined && (
          <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">
            {String(number).padStart(2, "0")}
          </span>
        )}
        <h2 className="text-lg sm:text-xl font-semibold text-gray-100 tracking-tight">
          {title}
        </h2>
      </div>
      <div className="border-t border-white/10 pt-5">{children}</div>
    </section>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ProposalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [proposal, setProposal] = useState<ClientProposal | null>(null);
  const [terms, setTerms] = useState<{ title: string; body: string; version: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/proposal/${token}`);
        if (!res.ok) {
          setError(res.status === 404 ? "not_found" : "error");
          return;
        }
        const data = (await res.json()) as { proposal: ClientProposal; terms?: { title: string; body: string; version: string } };
        setProposal(data.proposal);
        if (data.terms) setTerms(data.terms);
      } catch {
        setError("error");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading proposal…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (error === "not_found" || !proposal) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-200 mb-2">Proposal not found</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            This proposal link is invalid or has expired.
            If you believe this is an error, please contact OTwoOne.
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-200 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500">Please try again later or contact OTwoOne.</p>
        </div>
      </div>
    );
  }

  const p = proposal;
  const hasRunningCosts = Array.isArray(p.running_costs) && p.running_costs.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0b0f] text-gray-300">
      {/* ── Cover / Header ──────────────────────────────────────────────────── */}
      <header className="pt-12 sm:pt-20 pb-12 sm:pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* OTwoOne wordmark */}
          <div className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-400">
              OTwoOne
            </span>
          </div>

          {/* Proposal title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-8">
            {p.title || "Project Proposal"}
          </h1>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5 font-medium">
                Prepared for
              </p>
              <p className="text-gray-200 font-medium">
                {p.prepared_for || p.client_name || "—"}
              </p>
              {p.client_company && (
                <p className="text-gray-500 text-xs">{p.client_company}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5 font-medium">
                Prepared by
              </p>
              <p className="text-gray-200 font-medium">{p.prepared_by || "OTwoOne"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5 font-medium">
                Date
              </p>
              <p className="text-gray-200">{fmtDate(p.proposal_date)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5 font-medium">
                Valid until
              </p>
              <p className="text-gray-200">{fmtDate(p.valid_until)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="border-t border-white/5" />

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <main className="px-6 pt-12 sm:pt-16 pb-20">
        <div className="max-w-3xl mx-auto">
          {/* 1. Executive Summary */}
          {p.executive_summary && (
            <Section number={1} title="Executive Summary" id="executive-summary">
              <p className="text-sm sm:text-base leading-relaxed text-gray-300 whitespace-pre-line">
                {p.executive_summary}
              </p>
            </Section>
          )}

          {/* 2. Understanding Your Needs */}
          {p.problem_statement && (
            <Section number={2} title="Understanding Your Needs" id="problem">
              <p className="text-sm sm:text-base leading-relaxed text-gray-300 whitespace-pre-line">
                {p.problem_statement}
              </p>
            </Section>
          )}

          {/* 3. Recommended Solution */}
          {p.recommended_solution && (
            <Section number={3} title="Recommended Solution" id="solution">
              <p className="text-sm sm:text-base leading-relaxed text-gray-300 whitespace-pre-line">
                {p.recommended_solution}
              </p>
            </Section>
          )}

          {/* 4. Scope of Work */}
          {p.scope_items.length > 0 && (
            <Section number={4} title="Scope of Work" id="scope">
              <div className="space-y-4">
                {p.scope_items.map((item, i) => (
                  <div key={i} className="pl-4 border-l-2 border-indigo-500/30">
                    <p className="text-sm font-semibold text-gray-200">{item.label}</p>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 5. Deliverables */}
          {p.deliverables.length > 0 && (
            <Section number={5} title="Deliverables" id="deliverables">
              <div className="grid gap-3 sm:grid-cols-2">
                {p.deliverables.map((d, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 rounded-lg bg-white/[0.03] border border-white/5"
                  >
                    <p className="text-sm font-semibold text-gray-200">{d.label}</p>
                    {d.description && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {d.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 6. Delivery Timeline */}
          {(p.timeline_summary || p.timeline_phases.length > 0) && (
            <Section number={6} title="Delivery Timeline" id="timeline">
              {p.timeline_summary && (
                <p className="text-sm sm:text-base leading-relaxed text-gray-300 mb-6 whitespace-pre-line">
                  {p.timeline_summary}
                </p>
              )}
              {p.timeline_phases.length > 0 && (
                <div className="space-y-3">
                  {p.timeline_phases.map((phase, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 pl-4 border-l-2 border-indigo-500/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-200">{phase.phase}</p>
                          <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-medium">
                            {phase.duration}
                          </span>
                        </div>
                        {phase.description && (
                          <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">
                            {phase.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* 7. Investment */}
          {p.build_price && (
            <Section number={7} title="Investment" id="investment">
              {/* Build investment */}
              <div className="rounded-lg bg-white/[0.03] border border-white/10 overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 font-medium mb-1">
                    Project build
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {fmtCurrency(p.build_price)}
                  </p>
                </div>

                <div className="px-5 py-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 font-medium mb-0.5">
                      Deposit ({p.deposit_percent ?? 50}%)
                    </p>
                    <p className="text-base font-semibold text-indigo-400">
                      {fmtCurrency(p.deposit_amount)}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Due on acceptance</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 font-medium mb-0.5">
                      Balance
                    </p>
                    <p className="text-base font-semibold text-gray-200">
                      {fmtCurrency(p.balance_amount)}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {p.balance_terms || "Due on project completion"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Running costs */}
              {hasRunningCosts && (
                <div className="rounded-lg bg-white/[0.03] border border-white/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-gray-600 font-medium mb-1">
                      Estimated ongoing costs (monthly)
                    </p>
                    <p className="text-xs text-gray-500">
                      These are third-party service costs, separate from the project build.
                    </p>
                  </div>
                  <div className="px-5 py-3 divide-y divide-white/5">
                    {p.running_costs.map((cost, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm text-gray-300">{cost.name}</p>
                          <p className="text-[10px] text-gray-600">{cost.relevance}</p>
                        </div>
                        <p className="text-sm font-medium text-gray-300">
                          {cost.low === cost.high
                            ? fmtCurrency(cost.low)
                            : `${fmtCurrency(cost.low)} – ${fmtCurrency(cost.high)}`}
                          <span className="text-gray-600">/mo</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* 8. Assumptions */}
          {p.assumptions.length > 0 && (
            <Section number={8} title="Assumptions" id="assumptions">
              <ul className="space-y-2">
                {p.assumptions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400 leading-relaxed">
                    <span className="text-indigo-400/60 mt-0.5 shrink-0">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 9. Exclusions */}
          {p.exclusions.length > 0 && (
            <Section number={9} title="Exclusions" id="exclusions">
              <ul className="space-y-2">
                {p.exclusions.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400 leading-relaxed">
                    <span className="text-red-400/60 mt-0.5 shrink-0">•</span>
                    {e}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 10. Next Steps */}
          {p.next_steps.length > 0 && (
            <Section number={10} title="Next Steps" id="next-steps">
              <ol className="space-y-3">
                {p.next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-semibold shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* 11. Payment Terms */}
          {(p.payment_notes || p.balance_terms) && (
            <Section number={11} title="Payment Terms" id="payment-terms">
              <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
                {p.payment_notes && <p>{p.payment_notes}</p>}
                {p.balance_terms && !p.payment_notes?.includes(p.balance_terms) && (
                  <p>{p.balance_terms}</p>
                )}
                <p>
                  All prices are quoted in Euro (EUR) and are exclusive of VAT where applicable.
                </p>
              </div>
            </Section>
          )}

          {/* 12. Terms & Conditions */}
          <Section number={12} title={terms?.title || "Terms & Conditions"} id="terms">
            {terms?.body ? (
              <div className="space-y-4 text-sm text-gray-500 leading-relaxed">
                {terms.body.split("\n\n").map((paragraph, i) => {
                  // Detect numbered section headings (e.g. "1. Proposal Validity")
                  const headingMatch = paragraph.match(/^(\d+)\.\s+(.+)\n([\s\S]*)/);
                  if (headingMatch) {
                    return (
                      <div key={i}>
                        <p className="text-xs font-semibold text-gray-400 mb-1">
                          {headingMatch[1]}. {headingMatch[2]}
                        </p>
                        <p className="text-sm text-gray-500 leading-relaxed">{headingMatch[3]}</p>
                      </div>
                    );
                  }
                  return <p key={i}>{paragraph}</p>;
                })}
                <p className="text-[10px] text-gray-600 pt-2">
                  Terms version {terms.version}
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-gray-500 leading-relaxed">
                <p>
                  This proposal is valid until {fmtDate(p.valid_until)}.
                  Acceptance of this proposal constitutes agreement to the terms outlined herein.
                </p>
                <p>
                  Full terms and conditions are available on request from OTwoOne.
                </p>
              </div>
            )}
          </Section>

          {/* 13. Acceptance */}
          <Section number={13} title="Acceptance" id="acceptance">
            <div className="rounded-lg bg-white/[0.03] border border-white/10 px-6 py-8 text-center">
              <p className="text-sm text-gray-400 mb-6 leading-relaxed max-w-lg mx-auto">
                To accept this proposal, please confirm below. Upon acceptance, OTwoOne
                will issue a deposit invoice and schedule your project kickoff.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8 text-left">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-600 font-medium block mb-1">
                    Name
                  </label>
                  <div className="h-8 border-b border-white/10" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-600 font-medium block mb-1">
                    Company
                  </label>
                  <div className="h-8 border-b border-white/10" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-600 font-medium block mb-1">
                    Date
                  </label>
                  <div className="h-8 border-b border-white/10" />
                </div>
              </div>

              <button
                disabled
                className="px-8 py-3 rounded-lg text-sm font-semibold bg-indigo-600/40 text-indigo-300/60 cursor-not-allowed"
              >
                Approve Proposal
              </button>
              <p className="text-[10px] text-gray-600 mt-3">
                Online approval coming soon. For now, please confirm via email.
              </p>
            </div>
          </Section>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-indigo-400">
              OTwoOne
            </span>
            <p className="text-[10px] text-gray-600 mt-1">
              Studio · Consultancy · Branding
            </p>
          </div>
          <div className="text-right text-[10px] text-gray-600">
            <p>Cork, Ireland</p>
            <p>hello@otwoone.ie</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
