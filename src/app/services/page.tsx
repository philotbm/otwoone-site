import Image from "next/image";

// ─── Data ────────────────────────────────────────────────────────────────────

const SERVICES = [
  {
    label: "Websites",
    heading: "Websites built for trust and conversion.",
    description:
      "Fast, credible websites that turn interest into enquiries. We start with a clear brief, then build for performance from day one.",
    includes: [
      "Marketing and landing pages",
      "Booking and enquiry flows",
      "eCommerce and product catalogues",
      "Portfolio and case study sites",
      "Performance and SEO optimisation",
    ],
  },
  {
    label: "Automation & Systems",
    heading: "Systems that remove friction.",
    description:
      "We design and build practical systems that cut manual work. Booking flows, dashboards, integrations and automated reporting.",
    includes: [
      "CRM and booking integrations",
      "Internal dashboards and reporting",
      "Workflow and process automation",
      "Third-party API connections",
      "Data pipelines and scheduled tasks",
    ],
  },
  {
    label: "Digital Platforms",
    heading: "Platforms built around how you operate.",
    description:
      "When off the shelf tools do not fit, we build a platform that does. Booking systems, client portals, membership platforms and operational hubs designed around how your business actually works. Built to scale as you grow.",
    includes: [
      "Client and customer portals",
      "Booking and scheduling systems",
      "Membership and subscription platforms",
      "Multi-location or multi-user systems",
      "Payments, billing and reporting",
    ],
  },
  {
    label: "Branding",
    heading: "Brand identity, built to last.",
    description:
      "Clear messaging and a consistent visual identity that earns trust. Designed to work across your website, documents and social channels.",
    includes: [
      "Brand strategy and messaging",
      "Logo system and visual identity",
      "Colour palette and typography",
      "Brand guidelines and usage rules",
      "Brand and website launch packages",
    ],
  },
  {
    label: "Strategic Advisory",
    heading: "Clarity before you build.",
    description:
      "We help teams make the right decisions on scope, systems and delivery. Clear recommendations, practical next steps, and a plan you can execute.",
    includes: [
      "Scope and roadmap planning",
      "Technology options and trade offs",
      "AI and automation assessment",
      "System and process review",
      "GDPR and data protection guidance",
    ],
  },
];

const SUPPORT_PLANS = [
  {
    name: "Foundation",
    price: "€99",
    period: "/ month",
    features: [
      "Hosting monitoring and uptime checks",
      "Core updates",
      "Security monitoring",
      "Minor content edits",
    ],
  },
  {
    name: "Growth",
    price: "€199",
    period: "/ month",
    features: [
      "Everything in Foundation",
      "Monthly reporting",
      "Priority support",
      "Small conversion improvements",
    ],
    highlighted: true,
  },
  {
    name: "Accelerator",
    price: "€299",
    period: "/ month",
    features: [
      "Everything in Growth",
      "Ongoing improvements",
      "Quarterly review and planning",
      "Technical fixes and testing",
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-3">
          <a href="/" className="flex items-center gap-3 transition-opacity duration-200 hover:opacity-80">
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
              ["/",         "Home"],
              ["/services", "Services"],
              ["/#work",    "Our Work"],
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
            Start a project
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-8 pb-16 pt-14 md:pb-20 md:pt-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
            Services
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.02em] leading-[1.05] md:text-6xl">
            Digital foundations<br />
            <span className="text-white/35">for growing companies.</span>
          </h1>
          <p className="mt-7 text-base leading-relaxed text-white/55 md:text-lg">
            Websites, systems and scalable platforms built properly.
          </p>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="mx-auto max-w-6xl px-8 py-10 md:py-16">
        <div className="space-y-5">
          {SERVICES.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10
                         transition-all duration-300 hover:border-white/18"
            >
              <div className="grid gap-8 md:grid-cols-2 md:gap-12">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
                    {s.label}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-white md:text-2xl">
                    {s.heading}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/55">
                    {s.description}
                  </p>
                  {s.label === "Digital Platforms" && (
                    <p className="mt-3 text-sm text-white/45">
                      We approach platforms as products, not projects.
                    </p>
                  )}
                  <a
                    href="/elevate"
                    className="mt-6 inline-flex items-center text-sm font-semibold
                               text-white/50 transition-colors hover:text-white/80"
                  >
                    Start a brief →
                  </a>
                </div>

                <ul className="space-y-2.5 md:border-l md:border-white/8 md:pl-12">
                  {s.includes.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-white/60">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-white/30" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Website Support Plans ── */}
      <section className="mx-auto max-w-6xl px-8 py-12 md:py-20">
        <p className="text-xs font-semibold tracking-widest text-white/40 uppercase">
          Website Support Plans
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
          Ongoing support to keep your site secure, fast and up to date.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
          Ideal for sites that need updates, fixes and steady improvement after launch.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SUPPORT_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-7 transition-all duration-300
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

              <h3 className="text-xs font-semibold tracking-widest text-white/40 uppercase">
                {plan.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-white">
                  {plan.price}
                </span>
                <span className="text-sm text-white/40">{plan.period}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/8 pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
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
                Get started →
              </a>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-white/35">
          Plans are available to OTwoOne clients. Scope is confirmed at the start.
        </p>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-8 py-12 md:py-20">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Ready to start?
          </h2>
          <p className="mt-3 max-w-xl text-white/55 leading-relaxed">
            Tell us what you need. We will review your brief and come back with
            a clear plan and fixed price within one business day.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="/elevate"
              className="inline-flex items-center justify-center rounded-full bg-white
                         px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Start a project
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

          <p className="mt-5 text-xs text-white/35">
            Cork · Ireland · Response within one business day.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm text-white/40">
          <div>OTwoOne · Websites · Systems · Advisory · Cork, Ireland</div>
          <div className="flex gap-6">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/services" className="hover:text-white transition-colors">Services</a>
            <a href="/elevate" className="hover:text-white transition-colors">Start a project</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
