import Image from "next/image";

// ─── Data ────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    label: "Studio",
    headline: "Engineering that ships.",
    description:
      "From rapid Discovery Sprints to full MVP builds and ongoing engineering pods. We scope clearly, price fixed, and deliver shippable software.",
    offers: [
      "Discovery Sprint",
      "Technical Audit & Roadmap",
      "Prototype Sprint",
      "MVP Build",
      "Engineering Pod Retainer",
      "Stabilisation & Performance Care",
    ],
    accent: "border-white/20",
  },
  {
    label: "Consultancy",
    headline: "Clarity when it matters most.",
    description:
      "Strategic and technical advisory for companies navigating a decision, scaling a team, or unlocking value through AI and automation.",
    offers: [
      "Fractional CTO Advisory",
      "AI & Automation Assessment",
      "Delivery & Utilisation Tune-Up",
      "Value-Based Engagement",
    ],
    accent: "border-white/20",
  },
  {
    label: "Branding",
    headline: "Identity built to last.",
    description:
      "Positioning, messaging, and visual systems designed to unify your brand and product. From foundational strategy to full design-system delivery.",
    offers: [
      "Brand Foundation",
      "Visual Identity Kit",
      "Brand + Website Launch",
      "Design System Starter",
      "Brand / Design Retainer",
    ],
    accent: "border-white/20",
  },
];

const PROCESS_STEPS = [
  {
    n: "01",
    title: "Discovery",
    body: "Every engagement starts here. A fixed-price sprint to map the problem, scope deliverables, and produce a clear delivery plan before a euro is committed to build.",
  },
  {
    n: "02",
    title: "Proposal",
    body: "You receive a fixed-price proposal with defined deliverables, acceptance criteria, and timeline. No hourly estimates. No scope creep surprises.",
  },
  {
    n: "03",
    title: "Delivery",
    body: "Sprint-based execution with regular demos, QA gates, and structured handover. Code is documented. Decisions are recorded.",
  },
  {
    n: "04",
    title: "Ongoing",
    body: "After launch: retainer or stabilisation care. We don't disappear. We build responsibly and stay engaged on the terms that make sense.",
  },
];

const DIFFERENTIATORS = [
  {
    title: "Package-led, not hourly.",
    body: "We don't sell time. Every engagement is scoped and priced as a package — so you know the investment before you commit.",
  },
  {
    title: "Outcome-accountable.",
    body: "We carry delivery risk. If scope is met, the project is done. Bugs in the original build are our problem, not an extra invoice.",
  },
  {
    title: "Cork-based. Ireland-native.",
    body: "We understand Irish business, GDPR, and the local market. Expansion to UK/EU is structured, not assumed.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-3">
          <a href="#" className="flex items-center gap-3 transition-opacity duration-200 hover:opacity-80">
            <Image
              src="/branding/otwoone-logo.png"
              alt="OTwoOne"
              width={220}
              height={60}
              priority
              className="h-[40px] w-auto md:h-[44px]"
            />
          </a>

          <nav className="hidden items-center gap-10 text-[13px] tracking-wide text-white/60 md:flex">
            {[
              ["#services", "Services"],
              ["#process",  "How we work"],
              ["/pricing",  "Pricing"],
              ["#contact",  "Contact"],
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
            Start a project
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-8 pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Cork-based · Ireland &amp; UK/EU
        </div>

        <h1 className="mt-7 text-5xl font-semibold tracking-[-0.03em] leading-[1.0] md:text-7xl">
          Studio.{" "}
          <span className="text-white/40">Consultancy.</span>
          <br />
          Brand.
        </h1>

        <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
          A Cork-based practice that builds software, advises leadership teams, and
          shapes brand identity. Discovery-led. Fixed-price. Built properly.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/elevate"
            className="inline-flex items-center justify-center rounded-full bg-white
                       px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
          >
            Start with Discovery
          </a>
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full border
                       border-white/15 px-6 py-3 text-sm font-semibold text-white/90
                       hover:border-white/25 hover:text-white"
          >
            How we engage →
          </a>
        </div>

        <div className="mt-10 flex flex-wrap gap-2.5 text-xs text-white/50">
          {["Studio development", "Technical consulting", "Brand &amp; identity", "Design systems", "AI &amp; automation"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 px-3 py-1"
              dangerouslySetInnerHTML={{ __html: tag }}
            />
          ))}
        </div>
      </section>

      {/* ── Three Pillars ── */}
      <section id="services" className="mx-auto max-w-6xl px-8 py-20 md:py-24">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          What we do
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Three disciplines. One practice.
        </h2>
        <p className="mt-4 max-w-2xl text-white/55 leading-relaxed">
          We operate across studio development, strategic consultancy, and brand
          design — often together on the same engagement, always with clear scope
          and fixed pricing.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.label}
              className="group flex flex-col rounded-2xl border border-white/10
                         bg-white/[0.03] p-7 transition-all duration-300
                         hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
                {p.label}
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
                {p.headline}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                {p.description}
              </p>

              <ul className="mt-6 space-y-2 border-t border-white/8 pt-6">
                {p.offers.map((o) => (
                  <li key={o} className="flex items-center gap-2.5 text-sm text-white/60">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-white/30" />
                    {o}
                  </li>
                ))}
              </ul>

              <a
                href="/elevate"
                className="mt-auto pt-6 text-sm font-semibold text-white/50
                           transition-colors duration-200 group-hover:text-white/80"
              >
                Start a brief →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── How we engage ── */}
      <section id="process" className="mx-auto max-w-6xl px-8 py-20 md:py-24">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
            How we engage
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Scope first. Build second.
          </h2>
          <p className="mt-4 max-w-2xl text-white/55 leading-relaxed">
            Every engagement starts with a Discovery Sprint — a fixed-price, time-boxed
            scope that produces a clear delivery plan, backlog, and quote before a build
            commitment is made.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {PROCESS_STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-white/10 bg-black/40 p-5"
              >
                <div className="text-xs font-semibold tracking-widest text-white/35">{s.n}</div>
                <div className="mt-3 font-semibold text-white">{s.title}</div>
                <div className="mt-2.5 text-sm leading-relaxed text-white/55">{s.body}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border
                         border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80
                         hover:border-white/25 hover:text-white"
            >
              See how pricing works →
            </a>
          </div>
        </div>
      </section>

      {/* ── Differentiators ── */}
      <section className="mx-auto max-w-6xl px-8 py-16 md:py-20">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Why OTwoOne
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Built for outcomes, not activity.
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {DIFFERENTIATORS.map((d) => (
            <div
              key={d.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6
                         transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
            >
              <h3 className="font-semibold text-white leading-snug">{d.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact CTA ── */}
      <section id="contact" className="mx-auto max-w-6xl px-8 py-16 md:py-24">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
            Get started
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Start with a Discovery Sprint.
          </h2>
          <p className="mt-4 max-w-2xl text-white/55 leading-relaxed">
            Tell us what you&apos;re building or what you need. We&apos;ll review your brief and
            come back with a scope, timeline, and fixed quote within one business day.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/elevate"
              className="inline-flex items-center justify-center rounded-full bg-white
                         px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Submit a brief
            </a>
            <a
              href="mailto:info@otwoone.ie"
              className="inline-flex items-center justify-center rounded-full border
                         border-white/15 px-6 py-3 text-sm font-semibold text-white/90
                         hover:border-white/25 hover:text-white"
            >
              info@otwoone.ie
            </a>
          </div>

          <p className="mt-6 text-xs text-white/40">
            Cork · Ireland · Response within one business day.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-8 flex flex-col gap-8 md:flex-row md:items-start md:justify-between text-sm text-white/50">
          <div className="flex flex-col gap-2">
            <Image
              src="/branding/otwoone-logo.png"
              alt="OTwoOne"
              width={120}
              height={32}
              className="h-[28px] w-auto opacity-60"
            />
            <p className="max-w-xs leading-relaxed text-white/40">
              Studio · Consultancy · Branding<br />
              Cork, Ireland
            </p>
          </div>

          <div className="flex gap-10">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase">
                Services
              </p>
              {["Studio", "Consultancy", "Branding"].map((s) => (
                <a key={s} href="#services" className="hover:text-white transition-colors">{s}</a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase">
                Company
              </p>
              {[
                ["/pricing",         "How we price"],
                ["/elevate",         "Start a project"],
                ["mailto:info@otwoone.ie", "Contact"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="hover:text-white transition-colors">{label}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-8 mt-8 border-t border-white/5 pt-6 text-xs text-white/30">
          © {new Date().getFullYear()} OTwoOne Ltd. All rights reserved. · Cork, Ireland
        </div>
      </footer>
    </div>
  );
}
