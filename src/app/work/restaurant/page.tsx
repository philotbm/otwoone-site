// ─── The Copper Yard — Demo ───────────────────────────────────────────────────

const STARTERS = [
  { name: "Smoked Haddock Chowder", desc: "Cream, potato, chive oil", price: "€9" },
  { name: "Chicken Liver Pâté", desc: "Toasted sourdough, cornichons, apple jelly", price: "€10" },
  { name: "Crispy Calamari", desc: "Lemon aioli, mixed leaves", price: "€11" },
];

const MAINS = [
  { name: "Irish Beef Burger", desc: "Brioche bun, cheddar, bacon jam, fries", price: "€17" },
  { name: "Pan-Fried Cod", desc: "Crushed potatoes, green beans, lemon butter sauce", price: "€20" },
  { name: "Braised Lamb Shank", desc: "Creamy mash, roasted root vegetables, red wine jus", price: "€24" },
  { name: "Wild Mushroom Risotto", desc: "Truffle oil, parmesan, fresh herbs (V)", price: "€16" },
];

const DESSERTS = [
  { name: "Warm Chocolate Brownie", desc: "Vanilla ice cream, salted caramel sauce", price: "€8" },
  { name: "Sticky Toffee Pudding", desc: "Butterscotch sauce, clotted cream", price: "€8" },
  { name: "Cheeseboard", desc: "Selection of Irish cheeses, crackers, chutney", price: "€12" },
];

const EVENTS = [
  { date: "Sat 1 Mar", name: "Live Music Night", desc: "Trad session with The Blarney Boys from 8pm." },
  { date: "Fri 14 Mar", name: "St. Patrick's Weekend", desc: "Extended menu and live entertainment all weekend." },
  { date: "Sun 23 Mar", name: "Sunday Jazz Brunch", desc: "12pm – 3pm. Booking essential." },
];

const GALLERY = [
  "1414235077428-338989a2e8c0",
  "1504674900247-0877df9cc836",
  "1559339352-11d035aa65de",
  "1555396273-367ea4eb4db5",
];

export default function RestaurantDemo() {
  return (
    <div className="min-h-screen bg-stone-950 text-white font-sans">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-stone-950/95 border-b border-stone-800 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-xl font-black tracking-tight text-amber-400">THE COPPER YARD</span>
            <span className="ml-2 text-xs text-stone-500 tracking-widest uppercase">Cork City</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-stone-400 font-medium">
            <a href="#menu" className="hover:text-amber-400 transition">Menu</a>
            <a href="#gallery" className="hover:text-amber-400 transition">Gallery</a>
            <a href="#events" className="hover:text-amber-400 transition">Events</a>
            <a href="#book" className="hover:text-amber-400 transition">Book</a>
          </nav>
          <a
            href="#book"
            className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition"
          >
            Book a table
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[620px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80"
          alt="The Copper Yard"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/20" />
        <div className="relative h-full mx-auto max-w-6xl px-6 flex flex-col justify-end pb-16">
          <span className="inline-block text-xs font-semibold tracking-widest text-amber-400 uppercase mb-3">
            Cork City · Est. 2012
          </span>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight">
            Food, drink &<br />
            <span className="text-amber-400">good company.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-stone-300 leading-relaxed">
            A proper Cork pub and restaurant in the heart of the city. Great food,
            craft pints, and a warm welcome — every time.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a href="#menu" className="rounded-full bg-amber-500 px-7 py-3.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition">
              View menu
            </a>
            <a href="#book" className="rounded-full border border-stone-600 px-7 py-3.5 text-sm font-semibold text-stone-200 hover:border-stone-400 transition">
              Book a table
            </a>
          </div>
        </div>
      </section>

      {/* Info strip */}
      <div className="bg-amber-500 text-stone-950">
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-wrap justify-center gap-8 text-sm font-bold">
          <span>🕐 Open Daily 12pm – 11pm</span>
          <span>📍 8 Cornmarket Street, Cork</span>
          <span>📞 021 000 0003</span>
        </div>
      </div>

      {/* Menu */}
      <section id="menu" className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">What we serve</p>
            <h2 className="mt-3 text-3xl font-black text-white">Our Menu</h2>
            <p className="mt-2 text-stone-400 text-sm">Seasonal ingredients. Classic Cork cooking.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { label: "Starters", items: STARTERS },
              { label: "Mains", items: MAINS },
              { label: "Desserts", items: DESSERTS },
            ].map((section) => (
              <div key={section.label} className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
                <h3 className="text-xs font-black tracking-widest text-amber-400 uppercase mb-5 pb-3 border-b border-stone-700">
                  {section.label}
                </h3>
                <div className="space-y-5">
                  {section.items.map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-semibold text-white text-sm leading-tight">{item.name}</p>
                        <span className="font-black text-amber-400 text-sm shrink-0">{item.price}</span>
                      </div>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-stone-500">
            Menu changes seasonally. Allergen information available on request.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-4 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {GALLERY.map((id) => (
              <div key={id} className="aspect-square overflow-hidden rounded-2xl">
                <img
                  src={`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&h=400&q=80`}
                  alt="The Copper Yard"
                  className="h-full w-full object-cover hover:scale-105 transition duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">What's on</p>
            <h2 className="mt-3 text-3xl font-black text-white">Upcoming events</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {EVENTS.map((ev) => (
              <div key={ev.name} className="rounded-2xl border border-stone-700 bg-stone-900 p-7 hover:border-amber-500/30 transition">
                <div className="inline-block rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-1 text-xs font-bold text-amber-400 mb-4">
                  {ev.date}
                </div>
                <p className="font-black text-white text-base">{ev.name}</p>
                <p className="mt-2 text-sm text-stone-400 leading-relaxed">{ev.desc}</p>
                <a href="#book" className="mt-4 block text-sm font-semibold text-amber-400 hover:text-amber-300 transition">
                  Book a table →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book a table */}
      <section id="book" className="bg-stone-900 py-20 px-6">
        <div className="mx-auto max-w-lg">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">Reservations</p>
            <h2 className="mt-3 text-3xl font-black text-white">Book a table</h2>
            <p className="mt-2 text-stone-400 text-sm">Reserve your spot at The Copper Yard.</p>
          </div>
          <div className="rounded-2xl border border-stone-700 bg-stone-950 p-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Date</label>
                <input type="date" className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-500" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Time</label>
                <select className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-white outline-none appearance-none cursor-pointer">
                  {["12:00", "13:00", "18:00", "19:00", "20:00", "21:00"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Party size</label>
              <select className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-white outline-none appearance-none cursor-pointer">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Name</label>
                <input className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-500" placeholder="Your name" readOnly />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Phone</label>
                <input className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-500" placeholder="08X XXX XXXX" readOnly />
              </div>
            </div>
            <button className="w-full rounded-full bg-amber-500 py-4 text-sm font-black text-stone-950 hover:bg-amber-400 transition">
              Request booking
            </button>
            <p className="text-xs text-stone-600 text-center">Demo form — not connected</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:justify-between gap-6">
          <div>
            <div className="font-black text-amber-400 tracking-tight text-lg">THE COPPER YARD</div>
            <p className="mt-1 text-sm text-stone-500">8 Cornmarket Street · Cork City</p>
            <p className="text-sm text-stone-500">Open daily 12pm – 11pm</p>
          </div>
          <div className="flex gap-10 text-sm text-stone-500">
            <div className="space-y-2">
              <a href="#menu" className="block hover:text-amber-400 transition">Menu</a>
              <a href="#events" className="block hover:text-amber-400 transition">Events</a>
              <a href="#book" className="block hover:text-amber-400 transition">Book a table</a>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-6 border-t border-stone-800 text-center text-xs text-stone-700">
          © 2025 The Copper Yard · Demo site · Built by{" "}
          <a href="https://otwoone.ie" className="text-stone-600 hover:text-stone-400 transition">OTwoOne</a>
          {" "}· otwoone.ie
        </div>
      </footer>
    </div>
  );
}
