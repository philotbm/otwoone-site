// ─── Peak Fitness Studio — Demo ───────────────────────────────────────────────

const MEMBERSHIPS = [
  {
    name: "Basic",
    price: "€29",
    period: "/month",
    features: [
      "Gym floor access (Mon–Fri)",
      "2 group classes per week",
      "Locker & shower facilities",
      "App access & workout tracking",
    ],
    highlighted: false,
  },
  {
    name: "Plus",
    price: "€49",
    period: "/month",
    features: [
      "Unlimited gym access (7 days)",
      "Unlimited group classes",
      "Locker & shower facilities",
      "App access & workout tracking",
      "1 x personal training session/month",
    ],
    highlighted: true,
  },
  {
    name: "Unlimited",
    price: "€69",
    period: "/month",
    features: [
      "All Plus features",
      "Guest pass (2/month)",
      "Priority class booking",
      "Monthly fitness assessment",
      "Nutrition guidance session/month",
    ],
    highlighted: false,
  },
];

const TIMETABLE: { time: string; mon: string; tue: string; wed: string; thu: string; fri: string; sat: string }[] = [
  { time: "07:00", mon: "HIIT", tue: "Yoga", wed: "HIIT", thu: "Spin", fri: "HIIT", sat: "Bootcamp" },
  { time: "09:00", mon: "Pilates", tue: "Spin", wed: "Yoga", thu: "Pilates", fri: "Spin", sat: "Yoga" },
  { time: "12:00", mon: "Spin", tue: "Bootcamp", wed: "Pilates", thu: "HIIT", fri: "Yoga", sat: "HIIT" },
  { time: "18:00", mon: "Bootcamp", tue: "HIIT", wed: "Spin", thu: "Yoga", fri: "Bootcamp", sat: "" },
  { time: "19:30", mon: "Yoga", tue: "Pilates", wed: "HIIT", thu: "Bootcamp", fri: "Pilates", sat: "" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const GALLERY = [
  "1534438327276-14e5300c3a48",
  "1571019613454-1cb2f99b2d8b",
  "1517836357463-d25dfeac3438",
  "1599058917212-d750089bc07e",
];

const CLASS_COLORS: Record<string, string> = {
  HIIT: "bg-orange-500/20 text-orange-300 border-orange-500/25",
  Yoga: "bg-emerald-500/20 text-emerald-300 border-emerald-500/25",
  Spin: "bg-blue-500/20 text-blue-300 border-blue-500/25",
  Pilates: "bg-purple-500/20 text-purple-300 border-purple-500/25",
  Bootcamp: "bg-red-500/20 text-red-300 border-red-500/25",
};

export default function FitnessDemo() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 border-b border-zinc-800 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 font-black text-zinc-950 text-sm">P</div>
            <div>
              <div className="font-black text-white leading-tight tracking-tight">PEAK</div>
              <div className="text-[10px] text-zinc-500 leading-tight tracking-widest uppercase">Fitness Studio · Cork</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-medium">
            <a href="#classes" className="hover:text-orange-400 transition">Classes</a>
            <a href="#membership" className="hover:text-orange-400 transition">Membership</a>
            <a href="#timetable" className="hover:text-orange-400 transition">Timetable</a>
            <a href="#signup" className="hover:text-orange-400 transition">Join</a>
          </nav>
          <a
            href="#signup"
            className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-orange-400 transition"
          >
            Join now
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[640px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80"
          alt="Peak Fitness Studio"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/70 to-zinc-950/30" />
        <div className="relative h-full mx-auto max-w-6xl px-6 flex flex-col justify-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-orange-400 uppercase mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Cork City · Open 7 Days
          </span>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight max-w-2xl">
            Train smarter.
            <br />
            <span className="text-orange-400">Feel stronger.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base text-zinc-300 leading-relaxed">
            Cork&apos;s premium fitness studio. State-of-the-art equipment, expert coaches,
            and classes designed for every level.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#signup" className="rounded-full bg-orange-500 px-7 py-3.5 text-sm font-black text-zinc-950 hover:bg-orange-400 transition shadow-lg shadow-orange-500/25">
              Start your membership
            </a>
            <a href="#timetable" className="rounded-full border border-zinc-700 px-7 py-3.5 text-sm font-semibold text-zinc-200 hover:border-zinc-500 transition">
              View timetable
            </a>
          </div>
          <div className="mt-10 flex gap-8">
            {[
              { n: "6am–10pm", label: "Opening hours" },
              { n: "20+", label: "Classes weekly" },
              { n: "500+", label: "Members" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl font-black text-orange-400">{s.n}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery strip */}
      <section id="classes" className="py-5 px-6">
        <div className="mx-auto max-w-6xl grid grid-cols-4 gap-3">
          {GALLERY.map((id) => (
            <div key={id} className="aspect-video overflow-hidden rounded-2xl">
              <img
                src={`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&h=300&q=80`}
                alt="Peak Fitness"
                className="h-full w-full object-cover hover:scale-105 transition duration-500"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Membership */}
      <section id="membership" className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-orange-400 uppercase">Membership</p>
            <h2 className="mt-3 text-3xl font-black text-white">Choose your plan</h2>
            <p className="mt-2 text-zinc-400 text-sm">No joining fee in February. Cancel anytime.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {MEMBERSHIPS.map((m) => (
              <div
                key={m.name}
                className={`rounded-2xl border p-8 flex flex-col transition ${
                  m.highlighted
                    ? "border-orange-500/40 bg-orange-500/5 shadow-lg shadow-orange-500/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                {m.highlighted && (
                  <span className="self-start mb-4 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-black text-zinc-950 uppercase tracking-wide">
                    Most popular
                  </span>
                )}
                <div className="text-base font-bold text-zinc-300">{m.name}</div>
                <div className="mt-2 mb-6">
                  <span className="text-4xl font-black text-white">{m.price}</span>
                  <span className="text-sm text-zinc-500">{m.period}</span>
                </div>
                <ul className="flex-1 space-y-3 border-t border-zinc-800 pt-6">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="mt-0.5 text-orange-400 shrink-0 font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#signup"
                  className={`mt-8 block rounded-full py-3.5 text-sm font-bold text-center transition ${
                    m.highlighted
                      ? "bg-orange-500 text-zinc-950 hover:bg-orange-400 shadow-md"
                      : "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
                  }`}
                >
                  Get started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timetable */}
      <section id="timetable" className="bg-zinc-900 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest text-orange-400 uppercase">Schedule</p>
            <h2 className="mt-3 text-3xl font-black text-white">Class timetable</h2>
          </div>
          <div className="rounded-2xl border border-zinc-800 overflow-x-auto bg-zinc-950/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-4 text-xs text-zinc-500 font-semibold uppercase tracking-wide">Time</th>
                  {DAYS.map((d) => (
                    <th key={d} className="text-left px-4 py-4 text-xs text-zinc-300 font-black uppercase tracking-wide">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMETABLE.map((row, i) => (
                  <tr key={row.time} className={`border-b border-zinc-800/60 hover:bg-zinc-800/30 transition ${i === TIMETABLE.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-5 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap font-bold">{row.time}</td>
                    {[row.mon, row.tue, row.wed, row.thu, row.fri, row.sat].map((cls, j) => (
                      <td key={j} className="px-4 py-3">
                        {cls ? (
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold whitespace-nowrap ${CLASS_COLORS[cls] ?? "bg-zinc-700 text-zinc-300 border-zinc-600"}`}>
                            {cls}
                          </span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {Object.entries(CLASS_COLORS).map(([cls, color]) => (
              <span key={cls} className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${color}`}>
                {cls}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Sign up */}
      <section id="signup" className="py-20 px-6">
        <div className="mx-auto max-w-lg">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold tracking-widest text-orange-400 uppercase">Get started</p>
            <h2 className="mt-3 text-3xl font-black text-white">Join Peak today</h2>
            <p className="mt-2 text-zinc-400 text-sm">No joining fee in February. Cancel anytime.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">First name</label>
                <input className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500" placeholder="First name" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Last name</label>
                <input className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500" placeholder="Last name" readOnly />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Email</label>
              <input className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500" placeholder="you@example.com" readOnly />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Membership plan</label>
              <select className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none appearance-none cursor-pointer">
                <option>Basic — €29/month</option>
                <option>Plus — €49/month</option>
                <option>Unlimited — €69/month</option>
              </select>
            </div>
            <button className="w-full rounded-full bg-orange-500 py-4 text-sm font-black text-zinc-950 hover:bg-orange-400 transition shadow-lg shadow-orange-500/20">
              Join Peak Fitness
            </button>
            <p className="text-xs text-zinc-600 text-center">Demo form — not connected</p>
          </div>
        </div>
      </section>

      {/* Also built for Peak */}
      <section className="border-t border-zinc-800 py-10 px-6 bg-zinc-900/40">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-orange-400 uppercase mb-1">Also built for Peak</p>
            <p className="text-sm text-zinc-400">We also designed the Peak mobile app — a full booking system for iOS and Android.</p>
          </div>
          <a
            href="/work/fitness-app"
            className="shrink-0 flex items-center gap-2 rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:border-orange-500 hover:text-orange-400 transition"
          >
            📱 View the app design →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:justify-between gap-6">
          <div>
            <div className="font-black text-orange-400 tracking-tight text-lg">PEAK FITNESS STUDIO</div>
            <p className="mt-1 text-sm text-zinc-600">30 Lavitt&apos;s Quay, Cork City</p>
            <p className="text-sm text-zinc-600">Open 6am – 10pm daily</p>
          </div>
          <div className="flex gap-10 text-sm text-zinc-600">
            <div className="space-y-2">
              <a href="#classes" className="block hover:text-orange-400 transition">Classes</a>
              <a href="#membership" className="block hover:text-orange-400 transition">Membership</a>
              <a href="#timetable" className="block hover:text-orange-400 transition">Timetable</a>
              <a href="#signup" className="block hover:text-orange-400 transition">Join now</a>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-6 border-t border-zinc-900 text-center text-xs text-zinc-700">
          © 2025 Peak Fitness Studio · Demo site · Built by{" "}
          <a href="https://studioflow.ie" className="text-zinc-600 hover:text-zinc-400 transition">StudioFlow</a>
          {" "}· studioflow.ie
        </div>
      </footer>
    </div>
  );
}
