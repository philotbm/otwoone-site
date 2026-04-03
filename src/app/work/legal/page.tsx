// ─── Lynch & Partners Solicitors — Demo ──────────────────────────────────────

const PRACTICE_AREAS = [
  {
    icon: "🏠",
    name: "Conveyancing",
    desc: "Expert guidance through property purchases, sales, and transfers. We handle everything from contracts to closing.",
  },
  {
    icon: "⚖️",
    name: "Family Law",
    desc: "Sensitive, professional advice on separation, divorce, custody, and family arrangements.",
  },
  {
    icon: "💼",
    name: "Employment Law",
    desc: "Representing employees and employers on workplace disputes, contracts, and redundancy.",
  },
  {
    icon: "🏢",
    name: "Commercial Law",
    desc: "Supporting businesses with contracts, structures, acquisitions, and commercial disputes.",
  },
  {
    icon: "📝",
    name: "Wills & Probate",
    desc: "Drafting wills, estate planning, and managing the administration of estates with care.",
  },
  {
    icon: "🤝",
    name: "Dispute Resolution",
    desc: "Mediation, negotiation, and litigation support to resolve disputes efficiently.",
  },
];

const TEAM = [
  {
    name: "Ciara Lynch",
    title: "Senior Partner",
    area: "Conveyancing & Property",
    photo: "1560250097-0b93528c311a",
  },
  {
    name: "Declan O'Brien",
    title: "Partner",
    area: "Family & Employment Law",
    photo: "1507003211169-0a1dd7228f2d",
  },
  {
    name: "Sarah Quigley",
    title: "Solicitor",
    area: "Commercial Law",
    photo: "1573496359142-b8d87734a5a2",
  },
];

const STATS = [
  { n: "25+", label: "Years in practice" },
  { n: "2,000+", label: "Cases handled" },
  { n: "4.9★", label: "Client rating" },
  { n: "Cork", label: "Munster-based" },
];

export default function LegalDemo() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 border-b border-slate-200 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 font-bold text-base">L</div>
            <div>
              <div className="font-bold text-slate-900 leading-tight text-base">Lynch & Partners</div>
              <div className="text-[11px] text-slate-400 leading-tight tracking-wide">Solicitors · Cork</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#areas" className="hover:text-amber-700 transition">Practice Areas</a>
            <a href="#team" className="hover:text-amber-700 transition">Our Team</a>
            <a href="#contact" className="hover:text-amber-700 transition">Contact</a>
          </nav>
          <a
            href="#contact"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Make an enquiry
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[560px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1400&q=80"
          alt="Lynch & Partners Solicitors"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-slate-900/30" />
        <div className="relative h-full mx-auto max-w-6xl px-6 flex flex-col justify-center">
          <span className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
            Established 2000 · Cork, Ireland
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight max-w-2xl">
            Expert legal advice for individuals and businesses in Munster.
          </h1>
          <p className="mt-5 max-w-lg text-base text-slate-300 leading-relaxed">
            Lynch & Partners is a full-service solicitors practice based in Cork City.
            We offer clear, practical legal advice — tailored to your situation.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#contact"
              className="rounded-full bg-amber-500 px-7 py-3 text-sm font-bold text-white hover:bg-amber-400 transition shadow-md"
            >
              Make an enquiry
            </a>
            <a
              href="tel:+35321000001"
              className="rounded-full bg-white/10 border border-white/25 px-7 py-3 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur"
            >
              📞 021 000 0001
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-amber-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black text-amber-200">{s.n}</div>
              <div className="text-xs text-amber-100/80 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Practice areas */}
      <section id="areas" className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-amber-700 uppercase">What we do</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Practice areas</h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              We handle a broad range of legal matters, with specialist expertise across six core areas.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PRACTICE_AREAS.map((a) => (
              <div
                key={a.name}
                className="group rounded-2xl border border-slate-100 bg-white p-7 shadow-sm hover:shadow-md hover:border-amber-100 transition"
              >
                <div className="text-3xl mb-4">{a.icon}</div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{a.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{a.desc}</p>
                <div className="mt-4 text-sm font-semibold text-amber-700 group-hover:text-amber-600 transition">
                  Learn more →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="bg-slate-50 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-amber-700 uppercase">The team</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Your solicitors</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TEAM.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition">
                <div className="overflow-hidden h-64">
                  <img
                    src={`https://images.unsplash.com/photo-${t.photo}?auto=format&fit=crop&w=400&h=320&q=80`}
                    alt={t.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="font-bold text-slate-900 text-base">{t.name}</div>
                  <div className="text-sm text-amber-700 font-semibold mt-0.5">{t.title}</div>
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
            <p className="text-xs font-semibold tracking-widest text-amber-700 uppercase">Get in touch</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Make an enquiry</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Tell us what you need and we'll come back to you within one business day.
              All enquiries are treated in strict confidence.
            </p>
            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold">📍</div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Address</div>
                  <div className="text-sm text-slate-500 mt-0.5">22 South Mall, Cork City, T12 CD34</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold">📞</div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Phone</div>
                  <div className="text-sm text-slate-500 mt-0.5">021 000 0001</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold">✉️</div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Email</div>
                  <div className="text-sm text-slate-500 mt-0.5">info@lynchandpartners.ie</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
            <h3 className="text-lg font-bold text-slate-900 mb-5">Send us an enquiry</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">First name</label>
                  <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50" placeholder="First name" readOnly />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Last name</label>
                  <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-400" placeholder="Last name" readOnly />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
                <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-400" placeholder="you@example.com" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Area of enquiry</label>
                <select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none appearance-none cursor-pointer">
                  <option>Conveyancing</option>
                  <option>Family Law</option>
                  <option>Employment Law</option>
                  <option>Commercial Law</option>
                  <option>Wills & Probate</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your message</label>
                <textarea className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none min-h-[100px] resize-none focus:border-amber-400" placeholder="Brief description of your situation…" readOnly />
              </div>
              <button className="w-full rounded-full bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition">
                Send enquiry
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-sm">L</div>
              <span className="font-bold">Lynch & Partners Solicitors</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">Regulated by the Law Society of Ireland. Serving Munster since 2000.</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">Practice Areas</p>
            <div className="space-y-1.5 text-sm text-slate-400">
              {PRACTICE_AREAS.slice(0, 4).map((a) => (
                <a key={a.name} href="#areas" className="block hover:text-white transition">{a.name}</a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">Contact</p>
            <div className="space-y-1.5 text-sm text-slate-400">
              <p>22 South Mall, Cork City</p>
              <p>021 000 0001</p>
              <p>info@lynchandpartners.ie</p>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
          © 2025 Lynch & Partners Solicitors · Demo site · Built by{" "}
          <a href="https://otwoone.ie" className="text-slate-500 hover:text-slate-300 transition">OTwoOne</a>
          {" "}· otwoone.ie
        </div>
      </footer>
    </div>
  );
}
