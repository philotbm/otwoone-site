"use client";

// ─── Peak Fitness App — Demo ──────────────────────────────────────────────────

import { useState } from "react";

type Screen = "home" | "classes" | "book" | "profile";

const TABS: { id: Screen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "classes", label: "Classes" },
  { id: "book", label: "Book" },
  { id: "profile", label: "Profile" },
];

function ScreenHome() {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-950 text-white">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-zinc-400 shrink-0">
        <span className="font-semibold">9:41</span>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3 fill-zinc-400" viewBox="0 0 18 12"><rect x="0" y="3" width="3" height="9" rx="0.5"/><rect x="4" y="2" width="3" height="10" rx="0.5"/><rect x="8" y="0.5" width="3" height="11.5" rx="0.5"/><rect x="12" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
          <svg className="w-3.5 h-3 fill-zinc-400" viewBox="0 0 20 14"><path d="M10 2.4C6.7 2.4 3.8 3.7 1.7 5.9L0 4.1C2.5 1.5 5.9 0 10 0s7.5 1.5 10 4.1l-1.7 1.8C16.2 3.7 13.3 2.4 10 2.4z"/><path d="M10 6.8c-2.2 0-4.2.9-5.6 2.4L2.7 7.4C4.5 5.5 7.1 4.4 10 4.4s5.5 1.1 7.3 3l-1.7 1.8C14.2 7.7 12.2 6.8 10 6.8z"/><circle cx="10" cy="13" r="2"/></svg>
          <span className="font-semibold text-zinc-400">100%</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-4 shrink-0">
        <div>
          <p className="text-[11px] text-zinc-500 font-medium">Good morning,</p>
          <p className="text-base font-black text-white leading-tight">Sarah 👋</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-zinc-950">SB</div>
      </div>

      {/* Next class card */}
      <div className="mx-4 mb-4 rounded-2xl bg-orange-500 p-4 shrink-0">
        <p className="text-[10px] font-bold text-orange-950 uppercase tracking-wider mb-2">Your next class</p>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-black text-zinc-950">🔥 HIIT</p>
            <p className="text-[11px] text-orange-900 mt-0.5">Today · 7:00am</p>
            <p className="text-[11px] text-orange-900">Coach: Dan Murphy</p>
            <p className="text-[11px] text-orange-900 mt-1 font-semibold">8 spots remaining</p>
          </div>
          <button className="rounded-xl bg-zinc-950 px-3 py-1.5 text-[10px] font-bold text-white shrink-0">
            Book now →
          </button>
        </div>
      </div>

      {/* Weekly stats */}
      <div className="mx-4 mb-4 shrink-0">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Your week</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: "3", label: "classes", icon: "🏋️" },
            { val: "480", label: "calories", icon: "🔥" },
            { val: "2🔥", label: "streak", icon: "" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
              <p className="text-base font-black text-white">{s.val}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div className="mx-4 mb-4 shrink-0">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Upcoming</p>
        <div className="space-y-1.5">
          {[
            { cls: "Yoga", day: "Wed", time: "9:00am", color: "bg-emerald-500/15 border-emerald-500/25 text-emerald-300" },
            { cls: "Spin", day: "Thu", time: "7:00am", color: "bg-blue-500/15 border-blue-500/25 text-blue-300" },
          ].map((u) => (
            <div key={u.cls} className="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5">
              <span className={`text-[10px] font-bold rounded-lg border px-2 py-0.5 ${u.color}`}>{u.cls}</span>
              <span className="text-xs text-zinc-400">{u.day} · {u.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer for bottom nav */}
      <div className="h-16 shrink-0" />
    </div>
  );
}

function ScreenClasses() {
  const CLASSES = [
    { emoji: "🔥", name: "HIIT", time: "7:00am", coach: "Dan Murphy", spots: 8, full: false, color: "text-orange-400" },
    { emoji: "🧘", name: "Yoga", time: "9:00am", coach: "Sarah O'Brien", spots: 0, full: true, color: "text-emerald-400" },
    { emoji: "🚴", name: "Spin", time: "12:00pm", coach: "Mike Walsh", spots: 12, full: false, color: "text-blue-400" },
    { emoji: "💪", name: "Bootcamp", time: "6:00pm", coach: "Dan Murphy", spots: 5, full: false, color: "text-red-400" },
  ];
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-950 text-white">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-zinc-400 shrink-0">
        <span className="font-semibold">9:41</span>
        <span className="font-semibold">100%</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
        <p className="text-base font-black text-white">Classes</p>
        <button className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[10px] font-semibold text-zinc-400">Filter</button>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto shrink-0">
        {["Today", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
          <button
            key={d}
            className={`rounded-full px-3 py-1 text-[10px] font-bold whitespace-nowrap shrink-0 ${i === 0 ? "bg-orange-500 text-zinc-950" : "border border-zinc-700 text-zinc-500"}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Class cards */}
      <div className="px-4 space-y-2.5 pb-4 shrink-0">
        {CLASSES.map((cls) => (
          <div key={cls.name} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{cls.emoji}</span>
                  <span className={`text-sm font-black ${cls.color}`}>{cls.name}</span>
                </div>
                <p className="text-[11px] text-zinc-400">{cls.time} · {cls.coach}</p>
                {!cls.full && <p className="text-[10px] text-zinc-500 mt-1">{cls.spots} spots left</p>}
              </div>
              {cls.full ? (
                <button className="shrink-0 rounded-xl border border-zinc-700 px-3 py-1.5 text-[10px] font-semibold text-zinc-500">
                  Waitlist
                </button>
              ) : (
                <button className="shrink-0 rounded-xl bg-orange-500 px-3 py-1.5 text-[10px] font-bold text-zinc-950">
                  Book →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="h-16 shrink-0" />
    </div>
  );
}

function ScreenBook() {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-950 text-white">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-zinc-400 shrink-0">
        <span className="font-semibold">9:41</span>
        <span className="font-semibold">100%</span>
      </div>

      {/* Back + title */}
      <div className="flex items-center gap-3 px-5 pt-2 pb-3 shrink-0">
        <button className="text-zinc-400 text-sm">←</button>
        <p className="text-sm font-black text-white">Class Detail</p>
      </div>

      {/* Class header */}
      <div className="mx-4 mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-base font-black text-orange-400">HIIT</p>
            <p className="text-[11px] text-zinc-400">High Intensity Interval Training</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-zinc-400">📅 Today, Monday 3 March</p>
          <p className="text-[11px] text-zinc-400">🕖 7:00am – 7:45am · 45 min</p>
        </div>
      </div>

      {/* Coach */}
      <div className="mx-4 mb-3 flex items-center gap-3 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-black text-sm shrink-0">DM</div>
        <div>
          <p className="text-xs font-bold text-white">Dan Murphy</p>
          <p className="text-[10px] text-zinc-500">⭐ 4.9 · 120 classes taught</p>
        </div>
      </div>

      {/* Spots banner */}
      <div className="mx-4 mb-4 rounded-xl bg-orange-500/10 border border-orange-500/25 px-4 py-2.5 shrink-0">
        <p className="text-[11px] font-bold text-orange-400 text-center">8 spots remaining</p>
      </div>

      {/* What to bring */}
      <div className="mx-4 mb-5 shrink-0">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">What to bring</p>
        {["Water bottle", "Towel", "Training shoes"].map((item) => (
          <div key={item} className="flex items-center gap-2 py-1">
            <span className="text-orange-400 text-xs font-bold">✓</span>
            <span className="text-xs text-zinc-300">{item}</span>
          </div>
        ))}
      </div>

      {/* Confirm button */}
      <div className="mx-4 mb-4 shrink-0">
        <button className="w-full rounded-full bg-orange-500 py-3.5 text-sm font-black text-zinc-950">
          Confirm Booking
        </button>
      </div>

      <div className="h-16 shrink-0" />
    </div>
  );
}

function ScreenProfile() {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-950 text-white">
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-[11px] text-zinc-400 shrink-0">
        <span className="font-semibold">9:41</span>
        <span className="font-semibold">100%</span>
      </div>

      {/* Header */}
      <p className="text-base font-black text-white px-5 pt-2 pb-4 shrink-0">My Profile</p>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 px-5 mb-5 shrink-0">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-lg font-black text-zinc-950 shrink-0">SB</div>
        <div>
          <p className="text-sm font-black text-white">Sarah Brennan</p>
          <p className="text-[11px] text-zinc-500">sarah@example.com</p>
        </div>
      </div>

      {/* Membership */}
      <div className="mx-4 mb-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider">Plus Member</span>
          <span className="text-[10px] rounded-full bg-orange-500/15 border border-orange-500/25 px-2 py-0.5 text-orange-400 font-bold">Active</span>
        </div>
        <p className="text-[11px] text-zinc-400">Renews 31 March 2025</p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-orange-400 text-xs font-bold">✓</span>
          <span className="text-[11px] text-zinc-300">Unlimited classes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-orange-400 text-xs font-bold">✓</span>
          <span className="text-[11px] text-zinc-300">1 PT session/month</span>
        </div>
      </div>

      {/* Upcoming */}
      <div className="mx-4 mb-4 shrink-0">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Upcoming bookings</p>
        <div className="space-y-1.5">
          {[
            { cls: "HIIT", when: "Today · 7:00am", color: "text-orange-400" },
            { cls: "Spin", when: "Thu · 7:00am", color: "text-blue-400" },
          ].map((b) => (
            <div key={b.cls} className="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5">
              <span className={`text-[10px] font-black ${b.color}`}>{b.cls}</span>
              <span className="text-[11px] text-zinc-400">{b.when}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mb-5 shrink-0">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">This month</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
            <p className="text-lg font-black text-orange-400">12</p>
            <p className="text-[10px] text-zinc-500">classes</p>
          </div>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
            <p className="text-lg font-black text-orange-400">3🔥</p>
            <p className="text-[10px] text-zinc-500">week streak</p>
          </div>
        </div>
      </div>

      {/* Manage */}
      <div className="mx-4 mb-4 shrink-0">
        <button className="w-full rounded-full border border-zinc-700 py-3 text-sm font-semibold text-zinc-300">
          Manage membership →
        </button>
      </div>

      <div className="h-16 shrink-0" />
    </div>
  );
}

// Bottom nav bar rendered inside the phone
function PhoneBottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  const ICONS: Record<Screen, React.ReactNode> = {
    home: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    classes: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    book: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    profile: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  };
  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-zinc-950/98 border-t border-zinc-800 flex items-center justify-around px-2 pb-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${active === tab.id ? "text-orange-400" : "text-zinc-600 hover:text-zinc-400"}`}
        >
          {ICONS[tab.id]}
          <span className="text-[9px] font-semibold">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function FitnessAppDemo() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 border-b border-zinc-800 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 font-black text-zinc-950 text-sm">P</div>
            <div>
              <div className="font-black text-white leading-tight tracking-tight">PEAK</div>
              <div className="text-[10px] text-zinc-500 leading-tight tracking-widest uppercase">Fitness · App Design</div>
            </div>
          </div>
          <a
            href="/work/fitness"
            className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 hover:border-orange-500 hover:text-orange-400 transition"
          >
            View website →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-orange-400 uppercase mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            Our work · Health &amp; Wellness
          </span>
          <h1 className="text-4xl md:text-6xl font-black leading-none tracking-tight mb-5">
            The <span className="text-orange-400">Peak App.</span>
          </h1>
          <p className="text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Book classes, track sessions, and manage your membership — all from your phone.
            A mobile-first booking system designed for Peak Fitness Studio.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {/* App Store badge */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3">
              <svg className="w-6 h-6 fill-white shrink-0" viewBox="0 0 814 1000"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.4-147.8-112.4C140.6 736 110 639 110 548.1c0-195.7 127.4-299.7 252.7-299.7 66.1 0 121.2 43.4 162.6 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
              <div className="text-left">
                <p className="text-[9px] text-zinc-400 leading-tight">Download on the</p>
                <p className="text-xs font-bold text-white leading-tight">App Store</p>
              </div>
            </div>
            {/* Play badge */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3">
              <svg className="w-6 h-6 fill-white shrink-0" viewBox="0 0 48 48"><path d="M35.76 24 8 8.54v30.92L35.76 24z" opacity="0.8"/><path d="M8 8.54 28.22 28.76 35.76 24 8 8.54z" fill="#a8edea" opacity="0.9"/><path d="m8 39.46 20.22-20.22L8 8.54v30.92z" fill="#fdff52" opacity="0.5"/><path d="m28.22 28.76-20.22 10.7 28-16.46-7.78 5.76z" fill="#ff595f" opacity="0.9"/></svg>
              <div className="text-left">
                <p className="text-[9px] text-zinc-400 leading-tight">Get it on</p>
                <p className="text-xs font-bold text-white leading-tight">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive phone mockup */}
      <section className="py-8 px-6">
        <div className="flex flex-col items-center gap-8">

          {/* Screen tab buttons */}
          <div className="flex gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setScreen(tab.id)}
                className={`rounded-xl px-5 py-2 text-sm font-bold transition ${
                  screen === tab.id
                    ? "bg-orange-500 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Phone frame */}
          <div
            className="relative bg-zinc-900 rounded-[48px] border-4 border-zinc-700 shadow-2xl shadow-orange-500/5 overflow-hidden"
            style={{ width: 320, height: 660 }}
          >
            {/* Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-zinc-950 z-20" />

            {/* Screen content */}
            <div className="absolute inset-0 pt-1" style={{ paddingBottom: 64 }}>
              {screen === "home" && <ScreenHome />}
              {screen === "classes" && <ScreenClasses />}
              {screen === "book" && <ScreenBook />}
              {screen === "profile" && <ScreenProfile />}
            </div>

            {/* Bottom nav (always visible) */}
            <PhoneBottomNav active={screen} onChange={setScreen} />

            {/* Home indicator */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-zinc-600 z-20" />
          </div>

          <p className="text-xs text-zinc-600 text-center">Tap the tabs to explore the app screens</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-orange-400 uppercase">What it does</p>
            <h2 className="mt-3 text-3xl font-black text-white">Built for members, loved by staff.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "📅",
                title: "Smart booking",
                desc: "Book classes in seconds. See availability in real time, get reminders before every session, and cancel up to 2 hours before without a fee.",
              },
              {
                icon: "📊",
                title: "Progress tracking",
                desc: "See your attendance history, weekly streaks, and estimated calories burned over time. Motivating at a glance.",
              },
              {
                icon: "💳",
                title: "Membership hub",
                desc: "View and manage your plan, check your renewal date, access your personal training sessions, and upgrade any time.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech callout */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-8 py-7">
            <div className="grid md:grid-cols-4 gap-6 text-center">
              {[
                { val: "iOS + Android", label: "Cross-platform" },
                { val: "Real-time", label: "Availability updates" },
                { val: "Push", label: "Class reminders" },
                { val: "Stripe", label: "Payment integration" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-base font-black text-orange-400">{s.val}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-zinc-800">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-widest text-orange-400 uppercase mb-3">Built by StudioFlow</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Want an app like this?</h2>
          <p className="text-zinc-400 text-base leading-relaxed mb-8">
            We design and build mobile apps for Irish businesses. Class booking, e-commerce, internal tools — if your business needs an app, we&apos;ll plan it, price it, and build it properly.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/elevate"
              className="rounded-full bg-orange-500 px-8 py-3.5 text-sm font-black text-zinc-950 hover:bg-orange-400 transition shadow-lg shadow-orange-500/25"
            >
              Get started →
            </a>
            <a
              href="/work/fitness"
              className="rounded-full border border-zinc-700 px-8 py-3.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition"
            >
              View the full site →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6">
        <div className="mx-auto max-w-6xl text-center text-xs text-zinc-700">
          Demo app design · Built by{" "}
          <a href="https://studioflow.ie" className="text-zinc-600 hover:text-zinc-400 transition">StudioFlow</a>
          {" "}· studioflow.ie
        </div>
      </footer>
    </div>
  );
}
