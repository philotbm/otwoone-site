import Image from "next/image";

// ─── Data ────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: "📄",
    label: "Landing pages",
    description:
      "Single page sites built to convert. Hosting from €49 per month.",
  },
  {
    icon: "🌐",
    label: "Websites",
    description:
      "Structured multi page websites designed to represent your organisation clearly.",
  },
  {
    icon: "⚙️",
    label: "Automation and systems",
    description:
      "Practical digital systems that reduce manual work.",
  },
  {
    icon: "🛡️",
    label: "Ongoing hosting and maintenance",
    description:
      "Monitoring, security, updates and structured improvements from €49 per month.",
  },
];

const PROCESS_STEPS = [
  {
    n: "01",
    title: "Defined scope",
    body: "We agree exactly what is being delivered before any work begins.",
  },
  {
    n: "02",
    title: "Structured delivery",
    body: "Clear steps and visible progress throughout.",
  },
  {
    n: "03",
    title: "Transparent pricing",
    body: "No hidden extras and no unclear billing.",
  },
  {
    n: "04",
    title: "Ongoing clarity",
    body: "Support when required, without confusion or lock in.",
  },
];

const DIFFERENTIATORS = [
  {
    icon: "📦",
    title: "Package-led, not hourly.",
    body: "We don't bill by the hour. Every project is scoped and priced upfront, so you know exactly what it costs before you say yes.",
  },
  {
    icon: "🎯",
    title: "Outcome-accountable.",
    body: "We take responsibility for what we build. If something we built doesn't work as agreed, we fix it. That's not an extra charge. It's part of the job.",
  },
  {
    icon: "📍",
    title: "Cork-based. Ireland-native.",
    body: "We're based in Cork and we understand how Irish businesses work. Experience across Ireland, the UK, the EU and the US.",
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
    name: "Peak App: Booking System",
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
              alt="StudioFlow"
              width={220}
              height={60}
              priority
              className="h-[40px] w-auto md:h-[44px]"
            />
          </a>

          <nav className="hidden items-center gap-10 text-[13px] tracking-wide text-white/60 md:flex">
            {[
              ["/services",   "Services"],
              ["#process",   "How we work"],
              ["#work",      "Our Work"],
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
            Get started
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-8 pb-16 pt-14 md:pb-24 md:pt-20">
        <h1 className="mt-7 text-5xl font-semibold tracking-[-0.03em] leading-[1.0] md:text-7xl">
          Digital Solutions
        </h1>

        <p className="mt-5 max-w-2xl text-2xl font-medium leading-snug tracking-tight text-white/70 md:text-3xl">
          We build and manage your digital systems properly, so you can focus on your work.
        </p>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
          Clear scope. Transparent pricing. Long term reliability.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/elevate"
            className="inline-flex items-center justify-center rounded-full bg-white
                       px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
          >
            Get started
          </a>
          <a
            href="/services"
            className="inline-flex items-center justify-center rounded-full border
                       border-white/15 px-6 py-3 text-sm font-semibold text-white/90
                       hover:border-white/25 hover:text-white"
          >
            View services →
          </a>
        </div>
      </section>

      {/* ── Three Pillars ── */}
      <section id="services" className="mx-auto max-w-6xl px-8 py-16 md:py-20">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          What we do
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.label}
              className="group flex flex-col rounded-2xl border border-white/10
                         bg-white/[0.03] p-7 transition-all duration-300
                         hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span className="mb-3 block text-xl">{p.icon}</span>
              <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
                {p.label}
              </p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-white/60">
                {p.description}
              </p>
              <a
                href="/elevate"
                className="mt-6 text-sm font-semibold text-white/50
                           transition-colors duration-200 group-hover:text-white/80"
              >
                Start a brief →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── How we engage ── */}
      <section id="process" className="mx-auto max-w-6xl px-8 py-16 md:py-20">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">

            {/* Left: heading + outcome line */}
            <div>
              <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
                How we engage
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Scope first. Build second.
              </h2>
              <p className="mt-4 text-white/55 leading-relaxed">
                Built to deliver tangible value, whether that means generating enquiries, improving efficiency or strengthening your digital presence.
              </p>
            </div>

            {/* Right: stacked steps with dividers */}
            <div className="divide-y divide-white/[0.06]">
              {PROCESS_STEPS.map((s) => (
                <div key={s.n} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <svg
                    aria-hidden="true"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25"
                    fill="none"
                    viewBox="0 0 14 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 7h10M8 3l4 4-4 4" />
                  </svg>
                  <div>
                    <div className="text-sm font-semibold text-white">{s.title}</div>
                    <div className="mt-1 text-sm leading-relaxed text-white/50">{s.body}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Differentiators ── */}
      <section className="mx-auto max-w-6xl px-8 py-12 md:py-16">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Why StudioFlow
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Built for outcomes, not activity.
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* Left: larger block */}
          <div
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-8
                       transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
          >
            <span className="mb-3 block text-xl">{DIFFERENTIATORS[0].icon}</span>
            <h3 className="font-semibold text-white leading-snug">{DIFFERENTIATORS[0].title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/55">{DIFFERENTIATORS[0].body}</p>
          </div>

          {/* Right: two stacked blocks */}
          <div className="flex flex-col gap-5">
            {DIFFERENTIATORS.slice(1).map((d) => (
              <div
                key={d.title}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-6
                           transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <span className="mb-3 block text-xl">{d.icon}</span>
                <h3 className="font-semibold text-white leading-snug">{d.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Credentials ── */}
      <section id="about" className="mx-auto max-w-6xl px-8 py-12 md:py-16">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Why it matters
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          High standards. SME focus.
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {/* Left: paragraphs */}
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-white/60">
              We bring experience from large-scale, high-expectation environments
              where delivery and accountability matter. That translates into
              clearer scope, stronger execution and systems that hold up as
              you grow.
            </p>
            <p className="text-sm leading-relaxed text-white/60">
              We are comfortable working with personal data and regulated
              considerations where required. We design with privacy and good
              practice in mind. You get disciplined delivery without unnecessary
              complexity.
            </p>

            {/* GDPR callout */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-base">🔒</span>
                <div>
                  <p className="text-sm font-semibold text-white">GDPR & Data Protection</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                    We have worked in GDPR-aware environments and understand
                    what good practice looks like. If your project involves
                    customer records or sensitive information, we approach
                    it properly.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: stat chips */}
          <div className="flex flex-col justify-center gap-4">
            {[
              { icon: "⏱️", stat: "10+ years", label: "Large-scale delivery experience", sub: "EU/UK/US" },
              { icon: "🌍", stat: "EU/UK", label: "Multi-market operations awareness" },
              { icon: "🔒", stat: "GDPR", label: "Privacy and compliance mindset" },
            ].map((item) => (
              <div
                key={item.stat}
                className="flex items-center gap-4 rounded-2xl border border-white/10
                           bg-white/[0.03] p-5"
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight text-white">
                      {item.stat}
                    </span>
                    {"sub" in item && <span className="text-xs text-white/30">{item.sub}</span>}
                  </div>
                  <span className="text-sm text-white/50">{item.label}</span>
                </div>
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
          A snapshot of what StudioFlow delivers. Across sectors, for businesses of
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
              href="mailto:info@studioflow.ie"
              className="inline-flex items-center justify-center rounded-full border
                         border-white/15 px-6 py-3 text-sm font-semibold text-white/90
                         hover:border-white/25 hover:text-white"
            >
              info@studioflow.ie
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
              src="/branding/otwoone-logo-wordmark-white.png"
              alt="StudioFlow"
              width={601}
              height={201}
              className="h-[28px] w-auto opacity-60"
            />
            <p className="max-w-xs leading-relaxed text-white/40">
              Websites · Systems · Advisory<br />
              Cork, Ireland
            </p>
          </div>

          <div className="flex gap-10">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase">
                Services
              </p>
              {["Websites", "Systems", "Advisory"].map((s) => (
                <a key={s} href="/services" className="hover:text-white transition-colors">{s}</a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase">
                Company
              </p>
              {[
                ["/services",             "Our services"],
                ["/elevate",              "Get started"],
                ["mailto:info@studioflow.ie", "Contact"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="hover:text-white transition-colors">{label}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-8 mt-8 border-t border-white/5 pt-6 text-xs text-white/30">
          © {new Date().getFullYear()} StudioFlow Ltd. All rights reserved. · Cork, Ireland
        </div>
      </footer>
    </div>
  );
}
