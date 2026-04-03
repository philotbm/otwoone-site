// ─── Millfield Medical Centre — Demo ─────────────────────────────────────────

const SERVICES = [
  {
    icon: "🩺",
    name: "General Practice",
    desc: "Consultations for illness, injury, and routine check-ups with our experienced GPs.",
  },
  {
    icon: "💊",
    name: "Chronic Disease Management",
    desc: "Ongoing care and monitoring for conditions including diabetes, hypertension, and asthma.",
  },
  {
    icon: "💉",
    name: "Vaccinations",
    desc: "Childhood and adult vaccinations, flu shots, and travel health advice.",
  },
  {
    icon: "🧠",
    name: "Mental Health Referrals",
    desc: "Compassionate support and referrals to mental health services when you need them.",
  },
];

const HOURS = [
  { day: "Monday", hours: "8:00am – 6:00pm" },
  { day: "Tuesday", hours: "8:00am – 6:00pm" },
  { day: "Wednesday", hours: "8:00am – 8:00pm" },
  { day: "Thursday", hours: "8:00am – 6:00pm" },
  { day: "Friday", hours: "8:00am – 5:30pm" },
  { day: "Saturday", hours: "9:00am – 1:00pm" },
  { day: "Sunday", hours: "Closed" },
];

const TEAM = [
  { name: "Dr. Sarah Brennan", role: "GP & Practice Lead", seed: "sarah" },
  { name: "Dr. Ciarán Doyle", role: "General Practitioner", seed: "ciaran" },
  { name: "Nurse Aoife Walsh", role: "Practice Nurse", seed: "aoife" },
];

export default function MedicalDemo() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/95 border-b border-slate-100 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white font-bold text-sm">M</div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">Millfield Medical</div>
              <div className="text-[11px] text-slate-400 leading-tight">Centre</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#services" className="hover:text-sky-600 transition">Services</a>
            <a href="#team" className="hover:text-sky-600 transition">Our Team</a>
            <a href="#hours" className="hover:text-sky-600 transition">Opening Hours</a>
            <a href="#appointment" className="hover:text-sky-600 transition">Contact</a>
          </nav>
          <a
            href="#appointment"
            className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition shadow-sm"
          >
            Book Appointment
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[520px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=80"
          alt="Millfield Medical Centre"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/60 to-slate-900/20" />
        <div className="relative h-full mx-auto max-w-6xl px-6 flex flex-col justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-xs font-semibold text-sky-300 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Accepting new patients
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight max-w-xl">
            Your local GP practice in Cork City.
          </h1>
          <p className="mt-4 max-w-lg text-base text-slate-300 leading-relaxed">
            Millfield Medical Centre has been providing quality, patient-centred care
            to the Cork community for over 20 years. Our experienced team is here when you need us.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a
              href="#appointment"
              className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition shadow-md"
            >
              Request an appointment
            </a>
            <a
              href="tel:+35321000000"
              className="rounded-full bg-white/10 border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur"
            >
              📞 021 000 0000
            </a>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="bg-sky-600 text-white py-3">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap justify-center gap-8 text-sm font-medium">
          <span>✓ GMS & Private patients welcome</span>
          <span>✓ Online appointment requests</span>
          <span>✓ Same-day appointments available</span>
          <span>✓ Open Saturdays</span>
        </div>
      </div>

      {/* Services */}
      <section id="services" className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-sky-600 uppercase">Our services</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Comprehensive GP care</h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">We provide a full range of primary care services for individuals and families.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <div
                key={s.name}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-sky-100 transition group"
              >
                <div className="text-3xl mb-4">{s.icon}</div>
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
            <p className="text-xs font-semibold tracking-widest text-sky-600 uppercase">Meet the team</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Your healthcare team</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TEAM.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <img
                  src={`https://images.unsplash.com/photo-${t.seed === "sarah" ? "1559839734-2b71ea197ec2" : t.seed === "ciaran" ? "1612349317150-e413f6a5b16d" : "1594824476967-48c8b964273f"}?auto=format&fit=crop&w=400&h=300&q=80`}
                  alt={t.name}
                  className="w-full h-52 object-cover object-top"
                />
                <div className="p-5">
                  <div className="font-bold text-slate-900">{t.name}</div>
                  <div className="text-sm text-sky-600 font-medium mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hours + Appointment */}
      <section id="hours" className="py-20 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-semibold tracking-widest text-sky-600 uppercase">When we're open</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Opening hours</h2>
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
              {HOURS.map((h, i) => (
                <div
                  key={h.day}
                  className={`flex justify-between px-5 py-3.5 text-sm ${i < HOURS.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  <span className="font-medium text-slate-700">{h.day}</span>
                  <span className={h.hours === "Closed" ? "text-red-500 font-medium" : "text-slate-600"}>
                    {h.hours}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              For urgent matters outside opening hours, please call 112 or attend your nearest emergency department.
            </p>
          </div>

          <div id="appointment" className="rounded-2xl border border-sky-100 bg-sky-50 p-7 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Request an appointment</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              Fill in the form and we'll contact you to confirm a time.
            </p>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">First name</label>
                  <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" placeholder="First name" readOnly />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Last name</label>
                  <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-sky-400" placeholder="Last name" readOnly />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone number</label>
                <input className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-sky-400" placeholder="08X XXX XXXX" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preferred date</label>
                <input type="date" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-sky-400" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason for visit</label>
                <select className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none appearance-none cursor-pointer">
                  <option>General consultation</option>
                  <option>Follow-up appointment</option>
                  <option>Vaccination</option>
                  <option>Test results</option>
                  <option>Chronic disease review</option>
                </select>
              </div>
              <button className="w-full rounded-full bg-sky-600 py-3.5 text-sm font-bold text-white hover:bg-sky-700 transition shadow-md">
                Submit appointment request
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white font-bold text-sm">M</div>
              <span className="font-bold">Millfield Medical Centre</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">Quality patient-centred care for the Cork community since 2004.</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">Contact</p>
            <div className="space-y-1.5 text-sm text-slate-400">
              <p>14 Millfield Road, Cork City, T12 AB12</p>
              <p>021 000 0000</p>
              <p>info@millfieldmedical.ie</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">Quick links</p>
            <div className="space-y-1.5 text-sm text-slate-400">
              <a href="#services" className="block hover:text-white transition">Services</a>
              <a href="#team" className="block hover:text-white transition">Our Team</a>
              <a href="#appointment" className="block hover:text-white transition">Book Appointment</a>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
          © 2025 Millfield Medical Centre · Demo site · Built by{" "}
          <a href="https://studioflow.ie" className="text-slate-500 hover:text-slate-300 transition">StudioFlow</a>
          {" "}· studioflow.ie
        </div>
      </footer>
    </div>
  );
}
