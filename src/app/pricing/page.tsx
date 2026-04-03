import Image from "next/image";

// ─── Data ────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Submit a brief",
    body: "Tell us what you need: your project, challenge, or goal. No pitch deck required. A few sentences is enough to start.",
  },
  {
    n: "02",
    title: "We scope it",
    body: "We review your brief and respond within one business day with an initial read and, where appropriate, a Discovery Sprint proposal.",
  },
  {
    n: "03",
    title: "Discovery Sprint",
    body: "A fixed-price planning session where we map exactly what needs to be built, how long it will take, and what it will cost. You get a clear plan and a fixed quote before the build begins.",
  },
  {
    n: "04",
    title: "Fixed-price build",
    body: "You approve the plan. We commit to a fixed price and a clear list of what we'll deliver. No hourly billing, no surprises.",
  },
];

const ENGAGEMENT_TYPES = [
  {
    category: "Studio",
    offers: [
      {
        name: "Discovery Sprint",
        timeline: "2 weeks",
        includes: [
          "Stakeholder interviews",
          "Understanding your challenge and goals",
          "Technical plan for how it gets built",
          "Full project plan with tasks and timeline",
          "Cost estimates and a clear picture of risks",
        ],
        forWho: "For any business before committing to a project.",
      },
      {
        name: "MVP Build",
        timeline: "6–14 weeks",
        includes: [
          "Scoped after Discovery",
          "Design, build, QA",
          "Deployment + launch support",
          "Deliverables defined upfront",
        ],
        forWho: "For businesses building a new digital product or service from scratch.",
      },
      {
        name: "Engineering Pod Retainer",
        timeline: "3-month minimum",
        includes: [
          "A dedicated development team working on your project",
          "Regular updates and progress reviews",
          "Ongoing feature development and improvements",
          "Quality checks and delivery oversight",
        ],
        forWho: "For businesses that need ongoing development work without hiring a full-time team.",
      },
      {
        name: "Stabilisation & Performance Care",
        timeline: "3-month minimum",
        includes: [
          "Live system monitoring",
          "Guaranteed bug fixes within agreed timeframes",
          "Speed and reliability improvements",
          "Minor improvements",
        ],
        forWho: "For businesses that have launched and need reliable ongoing support.",
      },
    ],
  },
  {
    category: "Consultancy",
    offers: [
      {
        name: "Fractional CTO Advisory",
        timeline: "Monthly",
        includes: [
          "2 structured calls/month",
          "Ongoing technical guidance between calls",
          "Advice on building your technical team",
          "Oversight of technical decisions",
        ],
        forWho: "For business owners and leadership teams who need expert technology advice without a full-time hire.",
      },
      {
        name: "AI & Automation Assessment",
        timeline: "2 weeks",
        includes: [
          "Mapping your current processes",
          "Identifying what can be automated to save time and cost",
          "Expected return on investment",
          "A plan to test automation and measure results",
        ],
        forWho: "For businesses looking to reduce manual work and improve efficiency using technology.",
      },
      {
        name: "Delivery & Utilisation Tune-Up",
        timeline: "2 weeks",
        includes: [
          "Review of how your team currently delivers work",
          "Review of how you measure performance",
          "Team structure and resourcing review",
          "Identifying and addressing delivery risks",
        ],
        forWho: "For teams that want to deliver work more consistently and efficiently.",
      },
    ],
  },
  {
    category: "Branding",
    offers: [
      {
        name: "Brand Foundation",
        timeline: "2–3 weeks",
        includes: [
          "Positioning workshop",
          "Messaging pillars",
          "Voice & tone guidelines",
          "Competitive context",
        ],
        forWho: "For businesses that need to define or clarify what they stand for.",
      },
      {
        name: "Visual Identity Kit",
        timeline: "3–5 weeks",
        includes: [
          "Logo system",
          "Colour palette + typography",
          "Usage rules + brand guide",
          "Delivered in all standard formats",
        ],
        forWho: "Businesses that need a complete visual identity from scratch or rebrand.",
      },
      {
        name: "Brand + Website Launch",
        timeline: "6–10 weeks",
        includes: [
          "Brand Foundation included",
          "Marketing site design + build",
          "Content guidance (copywriting available as an add-on)",
          "Analytics + launch support",
        ],
        forWho: "For businesses launching or rebranding who need both their brand and website sorted together.",
      },
      {
        name: "Design System Starter",
        timeline: "2–4 weeks",
        includes: [
          "A library of consistent design components",
          "Shared design standards (colours, fonts, spacing)",
          "Guidelines on how to use everything",
          "Figma + code delivery",
        ],
        forWho: "For teams building digital products who want a consistent, professional look across everything.",
      },
    ],
  },
];

const SUPPORT_PLANS = [
  {
    name: "Starter",
    tagline: "For landing page sites.",
    features: [
      "Hosting & SSL certificate",
      "Uptime monitoring",
      "Security updates",
    ],
  },
  {
    name: "Foundation",
    tagline: "Peace of mind for live sites.",
    features: [
      "Hosting oversight & uptime monitoring",
      "Monthly security & platform updates",
      "1 hour of minor edits per month",
      "Email support",
      "Monthly health report",
    ],
  },
  {
    name: "Growth",
    tagline: "For businesses actively growing online.",
    features: [
      "Everything in Foundation",
      "Up to 3 hours development per month",
      "Monthly analytics review",
      "Priority response (next business day)",
      "Minor feature additions",
    ],
    highlighted: true,
  },
  {
    name: "Accelerator",
    tagline: "Digital as a core business driver.",
    features: [
      "Everything in Growth",
      "Up to 8 hours development per month",
      "Monthly strategy call",
      "SEO monitoring & recommendations",
      "Roadmap planning",
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-3">
          <a href="/" className="flex items-center gap-3 transition-opacity duration-200 hover:opacity-80">
            <Image
              src="/branding/otwoone-logo.png"
              alt="StudioFlow"
              width={220}
              height={60}
              priority
              className="h-[40px] w-auto md:h-[44px]"
            />
          </a>

          <nav className="hidden items-center gap-10 text-[13px] tracking-wide text-white/60 md:flex">
            {[
              ["/",         "Home"],
              ["/#services", "Services"],
              ["/pricing",  "Pricing"],
              ["/#contact", "Contact"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="relative transition-colors duration-200 hover:text-white
                           after:absolute after:-bottom-1 after:left-0 after:h-[1px]
                           after:w-0 after:bg-white after:transition-all after:duration-200
                           hover:after:w-full"
              >
                {label}
              </a>
            ))}
          </nav>

          <a
            href="/elevate"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black
                       transition-colors hover:bg-white/90"
          >
            Get started
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-8 pb-16 pt-14 md:pb-20 md:pt-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
            Pricing
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.02em] leading-[1.05] md:text-6xl">
            Clear scope.<br />
            Fixed price.<br />
            <span className="text-white/35">No surprises.</span>
          </h1>
          <p className="mt-7 text-base leading-relaxed text-white/55 md:text-lg">
            We don&apos;t charge by the hour. Every project starts with a clear plan
            and a fixed price, agreed before any work begins. You always know
            what you&apos;re paying for.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-8 py-16 md:py-20">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          The process
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
          How every engagement starts
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="text-xs font-semibold tracking-widest text-white/30">{s.n}</div>
              <div className="mt-3 font-semibold text-white">{s.title}</div>
              <div className="mt-2.5 text-sm leading-relaxed text-white/55">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Engagement types ── */}
      <section className="mx-auto max-w-6xl px-8 py-10 md:py-16">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          What&apos;s available
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
          Engagements by type
        </h2>
        <p className="mt-3 max-w-xl text-white/50 leading-relaxed">
          All pricing is confirmed after a Discovery Sprint or brief review.
          The engagements below describe what&apos;s included, not a rate card.
        </p>

        <div className="mt-10 space-y-14">
          {ENGAGEMENT_TYPES.map((category) => (
            <div key={category.category}>
              <div className="flex items-center gap-4 mb-6">
                <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
                  {category.category}
                </p>
                <div className="h-px flex-1 bg-white/8" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {category.offers.map((offer) => (
                  <div
                    key={offer.name}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6
                               transition-all duration-300 hover:-translate-y-0.5 hover:border-white/18"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-white text-base">{offer.name}</h3>
                      <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-0.5
                                       text-xs text-white/40 font-medium">
                        {offer.timeline}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-white/40 italic">{offer.forWho}</p>

                    <ul className="mt-4 space-y-1.5">
                      {offer.includes.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-white/60">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-white/25" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Support Plans ── */}
      <section className="mx-auto max-w-6xl px-8 py-12 md:py-16">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Ongoing support
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
          After your build, we stay involved.
        </h2>
        <p className="mt-3 max-w-2xl text-white/50 leading-relaxed">
          Every site we deliver can be covered by a monthly support plan, so it
          stays fast, secure, and improving.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {SUPPORT_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 transition-all duration-300
                         hover:-translate-y-0.5
                         ${plan.highlighted
                           ? "border-white/25 bg-white/[0.06]"
                           : "border-white/10 bg-white/[0.03] hover:border-white/18"
                         }`}
            >
              {plan.highlighted && (
                <span className="mb-3 self-start rounded-full bg-white/10 px-2.5 py-0.5
                                 text-xs font-semibold text-white/70">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-1 text-xs text-white/45 italic">{plan.tagline}</p>

              <ul className="mt-5 flex-1 space-y-2 border-t border-white/8 pt-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="/elevate"
                className="mt-6 inline-flex items-center justify-center rounded-full
                           border border-white/15 px-5 py-2.5 text-sm font-semibold
                           text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                Discuss this plan →
              </a>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-white/35">
          Support plans are available to all StudioFlow build clients. Pricing is
          confirmed based on the complexity of your site and your specific needs.
          Mention your preferred plan when submitting your brief.
        </p>
      </section>

      {/* ── No public pricing note ── */}
      <section className="mx-auto max-w-6xl px-8 py-12 md:py-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 md:p-10">
          <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
            On pricing
          </p>
          <h2 className="mt-4 text-xl font-semibold tracking-tight md:text-2xl">
            Why we don&apos;t publish a rate card.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Every project is different. Putting a price on a service before
            understanding your specific situation usually leads to the wrong
            number, either too high or too low. Instead, we start with your
            brief, understand what you actually need, and come back with a fixed
            price based on real scope.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            The planning session exists to protect both sides: you get a clear
            plan before committing to a build, and we get enough detail to price
            it accurately and stand behind what we deliver.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-8 py-12 md:py-20">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Ready to start?
          </h2>
          <p className="mt-3 max-w-xl text-white/55 leading-relaxed">
            Submit a brief. We&apos;ll review it and come back with a scope and fixed
            price within one business day.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="/elevate"
              className="inline-flex items-center justify-center rounded-full bg-white
                         px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Submit a brief
            </a>
            <a
              href="mailto:info@studioflow.ie"
              className="inline-flex items-center justify-center rounded-full border
                         border-white/15 px-6 py-3 text-sm font-semibold text-white/90
                         hover:border-white/25 hover:text-white"
            >
              Email us directly
            </a>
          </div>

          <p className="mt-5 text-xs text-white/35">
            Cork · Ireland · Response within one business day.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm text-white/40">
          <div>StudioFlow · Studio · Consultancy · Branding · Cork, Ireland</div>
          <div className="flex gap-6">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/elevate" className="hover:text-white transition-colors">Get started</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
