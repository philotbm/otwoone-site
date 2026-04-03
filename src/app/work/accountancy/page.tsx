// ─── Clarke & Co. Accountants — Demo ─────────────────────────────────────────

const SERVICES = [
  { icon: "📊", name: "Tax Returns", desc: "Personal and corporate tax returns prepared and filed accurately, on time, every year." },
  { icon: "💳", name: "Payroll", desc: "End-to-end payroll management for businesses of all sizes. Fully compliant with Revenue." },
  { icon: "📁", name: "Company Accounts", desc: "Annual accounts preparation, statutory filing with the CRO, and director reporting." },
  { icon: "📈", name: "Business Planning", desc: "Financial forecasts, cash flow planning, and advice to support key business decisions." },
  { icon: "📒", name: "Bookkeeping", desc: "Ongoing bookkeeping and management accounts so you always know where you stand." },
  { icon: "🏗️", name: "Start-up Advisory", desc: "Practical support for new businesses — from company formation to your first tax return." },
];

const TEAM = [
  { name: "Brian Clarke", title: "Managing Partner", area: "Corporate Tax", photo: "1560250097-0b93528c311a" },
  { name: "Aoife Murphy", title: "Senior Accountant", area: "Payroll & Bookkeeping", photo: "1573496359142-b8d87734a5a2" },
  { name: "Tom Walsh", title: "Accountant", area: "Personal Tax & Returns", photo: "1472099645785-5658abf4ff4e" },
];

const STATS = [
  { n: "20+", label: "Years in practice" },
  { n: "300+", label: "Active clients" },
  { n: "100%", label: "On-time filing record" },
  { n: "€0", label: "Penalty charges for clients" },
];

export default function AccountancyDemo() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 border-b border-slate-100 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-700 text-white font-black text-sm">C&</div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">Clarke & Co.</div>
              <div className="text-[11px] text-slate-400 leading-tight tracking-wide">Chartered Accountants · Cork</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600 font-medium">
            <a href="#services" className="hover:text-violet-700 transition">Services</a>
            <a href="#team" className="hover:text-violet-700 transition">Our Team</a>
            <a href="#contact" className="hover:text-violet-700 transition">Contact</a>
          </nav>
          <a
            href="#contact"
            className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-800 transition shadow-sm"
          >
            Request a callback
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[540px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80"
          alt="Clarke & Co Accountants"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950/90 via-violet-900/65 to-violet-900/20" />
        <div className="relative h-full mx-auto max-w-6xl px-6 flex flex-col justify-center">
          <span className="text-xs font-semibold tracking-widest text-violet-300 uppercase">
            Cork · Est. 2005 · Chartered Accountants Ireland
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight max-w-2xl">
            Trusted accountancy for Irish businesses.
          </h1>
          <p className="mt-5 max-w-lg text-base text-violet-100 leading-relaxed">
            Clarke & Co. provides straightforward, reliable accountancy services
            to sole traders, SMEs, and companies across Cork and Munster.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a
              href="#contact"
              className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-violet-900 hover:bg-violet-50 transition shadow-md"
            >
              Request a callback
            </a>
            <a
              href="tel:+35321000002"
              className="rounded-full bg-white/10 border border-white/25 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur"
            >
              📞 021 000 0002
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="bg-violet-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-white">{s.n}</div>
              <div className="text-xs text-violet-200 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <section id="services" className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-violet-700 uppercase">Services</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">What we do</h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              Comprehensive accountancy services, from day-to-day bookkeeping to
              strategic financial planning.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div
                key={s.name}
                className="group rounded-2xl border border-slate-100 bg-white p-7 shadow-sm hover:shadow-md hover:border-violet-100 transition"
              >
                <div className="text-3xl mb-4">{s.icon}</div>
                <div className="h-0.5 w-8 rounded-full bg-violet-600 mb-4" />
                <h3 className="font-bold text-slate-900 text-base mb-2">{s.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="bg-slate-50 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-violet-700 uppercase">The team</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Your accountants</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TEAM.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition">
                <div className="overflow-hidden h-60">
                  <img
                    src={`https://images.unsplash.com/photo-${t.photo}?auto=format&fit=crop&w=400&h=300&q=80`}
                    alt={t.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="font-bold text-slate-900">{t.name}</div>
                  <div className="text-sm text-violet-700 font-semibold mt-0.5">{t.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{t.area}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-14 items-start">
          <div>
            <p className="text-xs font-semibold tracking-widest text-violet-700 uppercase">Get in touch</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Request a callback</h2>
            <p className="mt-4 text-slate-500 leading-relaxed">
              Leave your details and we'll call you back within one business day for a
              free initial conversation. No commitment, no pressure.
            </p>
            <div className="mt-8 space-y-5">
              {[
                { icon: "📍", label: "Address", value: "5 Patrick Street, Cork City, T12 EF56" },
                { icon: "📞", label: "Phone", value: "021 000 0002" },
                { icon: "✉️", label: "Email", value: "info@clarkeandco.ie" },
                { icon: "🕘", label: "Office hours", value: "Mon – Fri 9am – 5:30pm" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">{item.icon}</div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{item.label}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Request a callback</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">First name</label>
                  <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50" placeholder="First name" readOnly />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Last name</label>
                  <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400" placeholder="Last name" readOnly />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Company name</label>
                <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400" placeholder="Company (if applicable)" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Phone number</label>
                <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400" placeholder="08X XXX XXXX" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Service needed</label>
                <select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none appearance-none cursor-pointer">
                  {SERVICES.map((s) => <option key={s.name}>{s.name}</option>)}
                  <option>General enquiry</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Best time to call</label>
                <select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none appearance-none cursor-pointer">
                  <option>Morning (9am – 12pm)</option>
                  <option>Afternoon (12pm – 3pm)</option>
                  <option>Late afternoon (3pm – 5:30pm)</option>
                </select>
              </div>
              <button className="w-full rounded-full bg-violet-700 py-3.5 text-sm font-bold text-white hover:bg-violet-800 transition shadow-md">
                Request callback
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400 text-center">Demo form — not connected</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 font-bold text-xs">C&</div>
              <span className="font-bold">Clarke & Co. Accountants</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">Member of Chartered Accountants Ireland. Serving Cork since 2005.</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">Services</p>
            <div className="space-y-1.5 text-sm text-slate-400">
              {SERVICES.slice(0, 4).map((s) => (
                <a key={s.name} href="#services" className="block hover:text-white transition">{s.name}</a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">Contact</p>
            <div className="space-y-1.5 text-sm text-slate-400">
              <p>5 Patrick Street, Cork City</p>
              <p>021 000 0002</p>
              <p>info@clarkeandco.ie</p>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
          © 2025 Clarke & Co. Chartered Accountants · Demo site · Built by{" "}
          <a href="https://otwoone.ie" className="text-slate-500 hover:text-slate-300 transition">OTwoOne</a>
          {" "}· otwoone.ie
        </div>
      </footer>
    </div>
  );
}
