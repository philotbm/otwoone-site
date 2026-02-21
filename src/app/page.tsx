// deploy trigger

import Image from "next/image";

const PRICING_ANCHOR = {
  starter: "from €1,800",
  growth: "from €3,500",
  systems: "from €5,000",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-3">
          {/* Logo */}
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

          {/* Nav */}
          <nav className="hidden items-center gap-10 text-[13px] tracking-wide text-white/60 md:flex">
            <a href="#services" className="relative transition-colors duration-200 hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 hover:after:w-full">
              Services
            </a>
            <a href="#proof" className="relative transition-colors duration-200 hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 hover:after:w-full">
              Examples
            </a>
            <a href="#pricing" className="relative transition-colors duration-200 hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 hover:after:w-full">
              Pricing
            </a>
            <a href="#process" className="relative transition-colors duration-200 hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 hover:after:w-full">
              Process
            </a>
            <a href="#contact" className="relative transition-colors duration-200 hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 hover:after:w-full">
              Contact
            </a>
          </nav>

          {/* CTA */}
          <a
            href="#contact"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
          >
            Talk to us
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-8 pb-14 pt-12 md:pb-20 md:pt-16">
        <div className="grid gap-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Cork-based • Ireland &amp; remote
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.02em] leading-[1.03] md:text-6xl">
              Websites and systems, built properly.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 md:text-lg">
              We design and build high-performing websites and automation systems for growing companies. Clear scope. Structured delivery. Built to last.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                Send us a brief
              </a>
              <a
                href="#services"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/90 hover:border-white/25 hover:text-white"
              >
                View services
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/60">
              <span className="rounded-full border border-white/10 px-3 py-1">
                Strategy &amp; copy
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Design &amp; brand
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Next.js builds
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Automation
              </span>
            </div>
          </div>

          <div className="md:col-span-5 md:-mt-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/7">
              <p className="text-sm font-semibold text-white/80">Project investment guide</p>

              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-5 py-4">
                  <span>Landing page</span>
                  <span className="font-semibold text-white/90 leading-snug">{PRICING_ANCHOR.starter}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-5 py-4">
                  <span>Website (multi-page)</span>
                  <span className="font-semibold text-white/90 leading-snug">{PRICING_ANCHOR.growth}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-5 py-4">
                  <span>Automation & systems</span>
                  <span className="font-semibold text-white/90 leading-snug">{PRICING_ANCHOR.systems}</span>
                </div>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-white/50">
                Final pricing depends on scope, content readiness and integrations. We confirm a fixed quote before build.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="relative mx-auto max-w-6xl px-8 py-20 md:py-24">
        <div className="absolute -top-10 left-0 right-0 h-16 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">What we do</h2>
            <p className="mt-3 max-w-xl text-white/60 leading-relaxed">
              Simple, high quality delivery, focused on outcomes and quality.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/7">
            <h3 className="text-lg font-semibold tracking-tight text-white">Websites that convert</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Premium design, sharp copy, fast load times, mobile-first — built to turn visits
              into enquiries.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/7">
            <h3 className="text-lg font-semibold tracking-tight text-white">Growth builds</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Multi-page sites, case studies, SEO foundations, analytics, lead capture and
              integration-ready structure.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/7">
            <h3 className="text-lg font-semibold tracking-tight text-white">Automation &amp; systems</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Quote flows, CRM setup, email automations, lightweight internal tools — remove
              manual work and keep quality high.
            </p>
          </div>
        </div>
      </section>

      {/* Proof / Examples */}
      <section id="proof" className="mx-auto max-w-6xl px-8 py-20 md:py-24">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Selected work</h2>
          <p className="mt-3 max-w-xl text-white/60 leading-relaxed">
            A small sample of what we ship. We’ll add full case studies as projects go live.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                tag: "Landing page",
                title: "High-converting service page",
                outcomes: ["Clear CTA hierarchy", "Improved load speed", "Mobile-first layout"],
              },
              {
                tag: "Growth site",
                title: "Multi-page business build",
                outcomes: ["Structured case studies", "SEO-ready architecture", "Analytics integration"],
              },
              {
                tag: "Automation",
                title: "Quote & intake system",
                outcomes: ["Reduced manual admin", "CRM integration", "Streamlined handover"],
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-white/10 bg-black/30 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <div className="text-xs font-semibold text-white/50">{c.tag}</div>
                <div className="mt-2 text-white font-semibold tracking-tight">
                  {c.title}
                </div>
                <ul className="mt-4 space-y-2 text-sm text-white/65">
                  {c.outcomes.map((o) => (
                    <li key={o} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Pricing</h2>
        <p className="mt-3 max-w-xl text-white/60 leading-relaxed">
          Clear starting points. Final pricing depends on scope, content readiness, and integrations. You’ll get a fixed quote before we start building.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">            <p className="text-sm font-semibold text-white/80">Starter</p>
            <p className="mt-2 text-2xl font-semibold">{PRICING_ANCHOR.starter}</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>• Single page / small site</li>
              <li>• Premium layout + copy polish</li>
              <li>• Fast delivery</li>
            </ul>
          </div>

          <div className="relative rounded-2xl border border-white/20 bg-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/30">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 text-black text-xs font-semibold px-3 py-1">
              Recommended
            </div>

            <p className="text-sm font-semibold text-white/80">Growth</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {PRICING_ANCHOR.growth}
            </p>

            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li>Multi-page site</li>
              <li>Case study structure</li>
              <li>Analytics + SEO foundation</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
            <p className="text-sm font-semibold text-white/80">Systems</p>
            <p className="mt-2 text-2xl font-semibold">{PRICING_ANCHOR.systems}</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>• Automations &amp; integrations</li>
              <li>• Quote &amp; intake flows</li>
              <li>• Internal tooling</li>
            </ul>
          </div>
        </div>
        {/* Managed platform */}
        <div className="mt-16 border-t border-white/10 pt-14">
          <p className="text-xs font-semibold tracking-wider text-white/50 uppercase">
            Managed platform
          </p>

          <h3 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight text-white">
            Your website, professionally managed
          </h3>

          <p className="mt-3 max-w-2xl text-white/60 leading-relaxed">
            Every OTwoOne website runs on our managed platform to ensure performance, security and long-term reliability.
            We don’t deliver projects and disappear.
            We build properly.
          </p>

          <p className="mt-6 text-2xl font-semibold tracking-tight text-white">
            €99 / month{" "}
            <span className="text-white/50 font-normal">· Minimum 6-month term</span>
          </p>

          <ul className="mt-6 space-y-3 text-sm text-white/65">
            <li>• Secure managed hosting</li>
            <li>• Ongoing framework &amp; security updates</li>
            <li>• Weekly backups</li>
            <li>• Uptime &amp; performance monitoring</li>
            <li>• Minor content updates (up to 30 mins / month)</li>
            <li>• Bug fixes related to the original build</li>
            <li>• Direct email support</li>
          </ul>

          <p className="mt-6 max-w-2xl text-sm text-white/60 leading-relaxed">
            After 6 months, you can continue, upgrade, or request a structured handover.
            <br />
            <span className="text-white/70">We don’t trap clients. We build responsibly.</span>
          </p>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Process</h2>
          <p className="mt-3 max-w-xl text-white/60 leading-relaxed">
            Clear milestones. Product delivered, fully ready to launch.
          </p>

          <div className="mt-7 grid gap-4 md:grid-cols-4">
            {[
              { k: "01", t: "Scope", d: "Define outcomes, structure, integrations and delivery plan." },
              { k: "02", t: "Design", d: "Refined layout, clear hierarchy and conversion focus." },
              { k: "03", t: "Build", d: "Clean code, fast performance and structured integrations." },
              { k: "04", t: "Launch", d: "QA, analytics setup and a confident go-live." },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-white/10 bg-black/30 p-5">
                <div className="text-xs font-semibold text-white/60">{s.k}</div>
                <div className="mt-2 text-white/90 font-semibold">{s.t}</div>
                <div className="mt-2 text-sm text-white/70">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Let’s build something sharp.
          </h2>
          <p className="mt-3 max-w-xl text-white/60 leading-relaxed">
            Tell us what you need. We’ll confirm scope, timeline and fixed pricing.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:info@otwoone.ie"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Send a brief. We’ll confirm scope, timeline and a fixed quote.
            </a>
            <a
              href="#services"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/90 hover:border-white/25 hover:text-white"
            >
              Review services
            </a>
          </div>

          <p className="mt-6 text-xs text-white/50">
            Cork • Ireland • Response within one business day.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between text-sm text-white/60">

          <div>
            <div className="text-white/80 font-semibold">OTwoOne</div>
            <div>Websites and systems that support real business growth.</div>
          </div>

          <div className="flex gap-6">
            <a href="#services" className="hover:text-white transition-colors">
              Services
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}