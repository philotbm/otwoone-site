import Image from "next/image";

// ─── Data ────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    label: "Studio",
    headline: "Engineering that ships.",
    description:
      "We build websites, web apps, and custom digital tools for businesses that need something built properly. Every project starts with a planning session so you know exactly what you're getting before any work begins.",
    offers: [
      "Project Planning & Scoping",
      "Tech Health Check",
      "Prototype Sprint",
      "New Product Build",
      "Ongoing Development Team",
      "Support & Maintenance",
    ],
    accent: "border-white/20",
  },
  {
    label: "Consultancy",
    headline: "Clarity when it matters most.",
    description:
      "Expert technology guidance for business owners and leaders making important decisions about systems, teams, or growth. We give you the answers without the full-time hire.",
    offers: [
      "Part-Time Technology Director",
      "AI & Automation Review",
      "Team & Process Health Check",
      "Outcome-Based Advisory",
    ],
    accent: "border-white/20",
  },
  {
    label: "Branding",
    headline: "Identity built to last.",
    description:
      "We build your brand from the ground up. Clear messaging, a strong visual identity, and a web presence that reflects who you are and speaks to the right customers.",
    offers: [
      "Brand Strategy & Messaging",
      "Logo, Colours & Brand Guide",
      "Brand + Website Package",
      "Design Guidelines & Components",
      "Ongoing Brand Support",
    ],
    accent: "border-white/20",
  },
];

const PROCESS_STEPS = [
  {
    n: "01",
    title: "Discovery",
    body: "Every project starts here. A fixed-price planning session where we map what you need, what it will take to build it, and what it will cost. No commitments until you're ready.",
  },
  {
    n: "02",
    title: "Proposal",
    body: "You receive a fixed-price proposal that sets out exactly what we'll build, when we'll deliver it, and what success looks like. No hourly billing, no hidden extras.",
  },
  {
    n: "03",
    title: "Delivery",
    body: "We build in stages, with regular progress updates and reviews along the way. You always know where the project stands, and everything is properly handed over at the end.",
  },
  {
    n: "04",
    title: "Ongoing",
    body: "After launch, we stay involved. Every site we build can be covered by a monthly support plan. Foundation, Growth, or Accelerator, depending on how actively you want to develop your digital presence.",
  },
];

const DIFFERENTIATORS = [
  {
    title: "Package-led, not hourly.",
    body: "We don't bill by the hour. Every project is scoped and priced upfront, so you know exactly what it costs before you say yes.",
  },
  {
    title: "Outcome-accountable.",
    body: "We take responsibility for what we build. If something we built doesn't work as agreed, we fix it. That's not an extra charge. It's part of the job.",
  },
  {
    title: "Cork-based. Ireland-native.",
    body: "We're based in Cork and we understand how Irish businesses work. We know the regulations, the market, and what it takes to grow here and into the UK and EU.",
  },
];

const EXAMPLES = [
  {
    slug: "medical",
    category: "Healthcare",
    name: "Millfield Medical Centre",
    description:
      "GP practice website with online appointment requests, opening hours, and patient information.",
    tags: ["Website", "Booking"],
    accent: "text-sky-400",
  },
  {
    slug: "legal",
    category: "Professional Services",
    name: "Lynch & Partners Solicitors",
    description:
      "Law firm site with practice areas, team profiles, and a client enquiry form.",
    tags: ["Website", "Enquiry Form"],
    accent: "text-amber-400",
  },
  {
    slug: "store",
    category: "Retail",
    name: "Harbour Street Home",
    description:
      "Irish home goods online store with product catalogue, cart, and checkout.",
    tags: ["eCommerce", "Online Store"],
    accent: "text-emerald-400",
  },
  {
    slug: "restaurant",
    category: "Hospitality",
    name: "The Copper Yard",
    description:
      "Cork pub and restaurant with menus, events listings, and a live table booking system.",
    tags: ["Website", "Table Booking"],
    accent: "text-rose-400",
  },
  {
    slug: "accountancy",
    category: "Professional Services",
    name: "Clarke & Co. Accountants",
    description:
      "Accountancy practice site with service listings, team bios, and a contact/callback form.",
    tags: ["Website", "Contact Form"],
    accent: "text-violet-400",
  },
  {
    slug: "fitness",
    category: "Health & Wellness",
    name: "Peak Fitness Studio",
    description:
      "Gym and fitness studio site with class timetable, membership options, and online sign-up.",
    tags: ["Website", "Class Booking"],
    accent: "text-orange-400",
  },
  {
    slug: "fitness-app",
    category: "Health & Wellness",
    name: "Peak App — Booking System",
    description:
      "Mobile app design for a fitness studio. Class booking, timetable, membership management, and progress tracking.",
    tags: ["App Design", "Booking"],
    accent: "text-orange-400",
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
              ["#services",  "Services"],
              ["#process",   "How we work"],
              ["#work",      "Our Work"],
              ["/pricing",   "Pricing"],
              ["#contact",   "Contact"],
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
          We help Irish businesses build the right digital solution. Websites,
          apps, and tools that actually solve the problem. Properly planned,
          fairly priced, delivered on time.
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
          We work across software development, strategic consultancy, and brand
          design. Often together on the same project, always with a clear scope
          and a fixed price agreed before work begins.
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
            Every project starts with a planning session. We agree on exactly
            what needs to be built, at what price, before any work begins.
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

      {/* ── Credentials ── */}
      <section id="about" className="mx-auto max-w-6xl px-8 py-16 md:py-20">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Why it matters
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Multinational experience. SME focus.
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {/* Left: paragraphs */}
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-white/60">
              OTwoOne is led by someone who has spent over a decade inside
              large-scale multinational operations, including leading customer
              experience and regulatory teams at Amazon. That includes guiding
              the company through GDPR compliance across multiple European
              markets.
            </p>
            <p className="text-sm leading-relaxed text-white/60">
              What that means for you: we understand how to build things that
              actually work at scale, how to navigate data protection and
              regulatory requirements, and how to bring enterprise-grade thinking
              to organisations of any size. Without the enterprise price tag or
              the complexity.
            </p>

            {/* GDPR callout */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-base">🔒</span>
                <div>
                  <p className="text-sm font-semibold text-white">GDPR & Data Protection</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                    We have hands-on experience navigating GDPR compliance at
                    scale, including policy design, team training, and
                    cross-functional implementation. If your project involves
                    personal data, customer records, or regulated information,
                    we know the landscape.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: stat chips */}
          <div className="flex flex-col justify-center gap-4">
            {[
              { stat: "10+ years", label: "Multinational sector experience" },
              { stat: "Amazon", label: "Customer experience & regulatory leadership" },
              { stat: "GDPR", label: "Hands-on compliance implementation" },
            ].map((item) => (
              <div
                key={item.stat}
                className="flex items-center gap-5 rounded-2xl border border-white/10
                           bg-white/[0.03] p-5"
              >
                <span className="text-2xl font-semibold tracking-tight text-white">
                  {item.stat}
                </span>
                <span className="text-sm text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Work ── */}
      <section id="work" className="mx-auto max-w-6xl px-8 py-16 md:py-20">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Our work
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          What we build
        </h2>
        <p className="mt-4 max-w-2xl text-white/55 leading-relaxed">
          A flavour of what OTwoOne delivers. Across sectors, for businesses of
          all sizes.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {EXAMPLES.map((ex) => (
            <a
              key={ex.slug}
              href={`/work/${ex.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10
                         bg-white/[0.03] p-6 transition-all duration-300
                         hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <p className={`text-xs font-semibold tracking-widest uppercase ${ex.accent}`}>
                {ex.category}
              </p>
              <h3 className="mt-2 font-semibold text-white">{ex.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55 flex-1">
                {ex.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {ex.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 px-2.5 py-0.5
                               text-xs text-white/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="mt-4 text-sm font-semibold text-white/40
                            transition-colors group-hover:text-white/70">
                View demo →
              </p>
            </a>
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
            Let&apos;s talk about what you need.
          </h2>
          <p className="mt-4 max-w-2xl text-white/55 leading-relaxed">
            Tell us about your project or challenge. We&apos;ll review your details
            and come back with a clear plan, timeline, and fixed price within
            one business day.
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
                ["/pricing",              "How we price"],
                ["/elevate",              "Start a project"],
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
