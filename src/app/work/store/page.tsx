// ─── Harbour Street Home — Demo ───────────────────────────────────────────────

const PRODUCTS = [
  {
    name: "Linen Throw",
    price: "€49",
    category: "Textiles",
    photo: "1583847268964-b28dc8f51f92",
    desc: "Softly woven Irish linen, pre-washed for a relaxed finish.",
  },
  {
    name: "Ceramic Mug Set",
    price: "€32",
    category: "Kitchen",
    photo: "1514228742587-6b1558fcca3d",
    desc: "Set of 4 hand-thrown stoneware mugs in a warm salt glaze.",
  },
  {
    name: "Woven Cushion Cover",
    price: "€28",
    category: "Textiles",
    photo: "1567225557594-88887e4518d8",
    desc: "Textured weave in natural tones. 45 x 45cm. Insert sold separately.",
  },
  {
    name: "Beeswax Pillar Candle",
    price: "€18",
    category: "Home Fragrance",
    photo: "1603006905003-be475563bc59",
    desc: "Pure beeswax with a honey scent. Burns for up to 40 hours.",
  },
  {
    name: "Stone Coasters (Set of 4)",
    price: "€24",
    category: "Kitchen",
    photo: "1616046229478-9901baef7f13",
    desc: "Hand-cut Connemara marble coasters with natural felt backing.",
  },
  {
    name: "Merino Wool Blanket",
    price: "€85",
    category: "Textiles",
    photo: "1580301762395-f05cb6e0d634",
    desc: "Super-soft 100% Irish merino. Herringbone weave. Machine washable.",
  },
];

const CATEGORIES = ["All", "Textiles", "Kitchen", "Home Fragrance", "Gifts"];

export default function StoreDemo() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans">

      {/* Announcement bar */}
      <div className="bg-emerald-800 text-emerald-50 text-center py-2 text-xs font-medium tracking-wide">
        Free delivery on orders over €75 · Free returns within 30 days
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-lg font-black tracking-tight text-emerald-900">HARBOUR STREET</span>
            <span className="ml-2 text-sm text-stone-400 font-medium tracking-widest uppercase">Home</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-stone-600">
            {CATEGORIES.slice(1).map((c) => (
              <a key={c} href="#products" className="hover:text-emerald-700 transition font-medium">{c}</a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button className="relative text-stone-600 hover:text-emerald-700 transition p-1">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
            <button className="relative text-stone-600 hover:text-emerald-700 transition p-1">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-emerald-600 text-[10px] text-white flex items-center justify-center font-bold">0</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[560px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=80"
          alt="Harbour Street Home"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-900/50 to-stone-900/10" />
        <div className="relative h-full mx-auto max-w-6xl px-6 flex flex-col justify-center">
          <span className="text-xs font-semibold tracking-widest text-emerald-300 uppercase">
            Irish-made · Sustainably sourced
          </span>
          <h1 className="mt-4 text-4xl md:text-6xl font-black text-white leading-none tracking-tight max-w-xl">
            Homeware you'll love for years.
          </h1>
          <p className="mt-5 max-w-md text-base text-stone-300 leading-relaxed">
            Thoughtfully crafted pieces for Irish homes. We work directly with
            Irish makers and sustainable suppliers.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a
              href="#products"
              className="rounded-full bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 transition shadow-lg"
            >
              Shop the collection
            </a>
            <a
              href="#"
              className="rounded-full bg-white/15 border border-white/25 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/25 transition backdrop-blur"
            >
              Our story
            </a>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <div className="bg-white border-y border-stone-200">
        <div className="mx-auto max-w-6xl px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          {[
            { icon: "🚚", label: "Free delivery over €75" },
            { icon: "↩️", label: "30-day free returns" },
            { icon: "🇮🇪", label: "Irish-made products" },
            { icon: "🌿", label: "Sustainably sourced" },
          ].map((f) => (
            <div key={f.label} className="flex items-center justify-center gap-2 text-stone-600">
              <span>{f.icon}</span>
              <span className="font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <section id="products" className="py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Featured products</h2>
              <p className="text-sm text-stone-500 mt-1">Handpicked from our latest collection</p>
            </div>
            <div className="hidden md:flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${c === "All" ? "bg-emerald-700 text-white" : "border border-stone-200 text-stone-600 hover:border-emerald-400 hover:text-emerald-700"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div
                key={p.name}
                className="group rounded-2xl bg-white border border-stone-100 overflow-hidden shadow-sm hover:shadow-lg transition"
              >
                <div className="overflow-hidden h-56 bg-stone-100">
                  <img
                    src={`https://images.unsplash.com/photo-${p.photo}?auto=format&fit=crop&w=600&h=400&q=80`}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{p.category}</div>
                  <h3 className="mt-1 font-bold text-slate-900">{p.name}</h3>
                  <p className="mt-1 text-xs text-stone-500 leading-relaxed">{p.desc}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-black text-slate-900">{p.price}</span>
                    <button className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition">
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-emerald-900 py-16 px-6 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-bold text-white">Stay in touch</h2>
          <p className="mt-2 text-emerald-200 text-sm">
            New arrivals, stories from our makers, and the occasional discount.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 rounded-full border border-emerald-700 bg-emerald-800 px-5 py-3 text-sm text-white placeholder:text-emerald-400 outline-none focus:border-emerald-400"
              placeholder="your@email.com"
              readOnly
            />
            <button className="rounded-full bg-white px-6 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50 transition">
              Subscribe
            </button>
          </div>
          <p className="mt-3 text-xs text-emerald-500">Demo form — not connected</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white py-12 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-black text-lg tracking-tight text-emerald-400 mb-2">HARBOUR STREET HOME</div>
            <p className="text-sm text-stone-400 leading-relaxed">Cork, Ireland · Est. 2019. Thoughtfully made for Irish homes.</p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase mb-3">Shop</p>
              <div className="space-y-1.5 text-sm text-stone-400">
                {CATEGORIES.slice(1).map((c) => (
                  <a key={c} href="#" className="block hover:text-white transition">{c}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase mb-3">Help</p>
              <div className="space-y-1.5 text-sm text-stone-400">
                <a href="#" className="block hover:text-white transition">Delivery & Returns</a>
                <a href="#" className="block hover:text-white transition">Contact us</a>
                <a href="#" className="block hover:text-white transition">FAQs</a>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-stone-500 uppercase mb-3">Contact</p>
            <div className="space-y-1.5 text-sm text-stone-400">
              <p>Harbour Street, Cork City</p>
              <p>info@harbourstreethome.ie</p>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-6 border-t border-stone-800 text-center text-xs text-stone-600">
          © 2025 Harbour Street Home · Demo site · Built by{" "}
          <a href="https://otwoone.ie" className="text-stone-500 hover:text-stone-300 transition">OTwoOne</a>
          {" "}· otwoone.ie
        </div>
      </footer>
    </div>
  );
}
