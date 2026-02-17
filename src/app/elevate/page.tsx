"use client";

import { useState, FormEvent } from "react";

type Status = "idle" | "sending" | "done" | "error";

export default function ElevatePage() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = new FormData(e.currentTarget);

    const payload = {
      contact_name: String(form.get("contact_name") ?? ""),
      contact_email: String(form.get("contact_email") ?? ""),
      company_name: String(form.get("company_name") ?? ""),
      company_website: String(form.get("company_website") ?? ""),
      answers: {
        goal: String(form.get("goal") ?? ""),
        budget: String(form.get("budget") ?? ""),
        timeline: String(form.get("timeline") ?? ""),
      },
    };

    try {
      const res = await fetch("/api/elevate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) setStatus("done");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-3xl font-bold mb-6">OTwoOne Elevate Intake</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <input
          name="contact_name"
          placeholder="Your name"
          required
          className="w-full p-3 bg-zinc-900 border border-zinc-700"
        />
        <input
          name="contact_email"
          placeholder="Email"
          required
          className="w-full p-3 bg-zinc-900 border border-zinc-700"
        />
        <input
          name="company_name"
          placeholder="Company"
          className="w-full p-3 bg-zinc-900 border border-zinc-700"
        />
        <input
          name="company_website"
          placeholder="Website"
          className="w-full p-3 bg-zinc-900 border border-zinc-700"
        />

        <textarea
          name="goal"
          placeholder="What are you trying to achieve?"
          className="w-full p-3 bg-zinc-900 border border-zinc-700"
        />

        <select
          name="budget"
          className="w-full p-3 bg-zinc-900 border border-zinc-700"
          defaultValue="Under €2k"
        >
          <option value="Under €2k">Under €2k</option>
          <option value="€2k–€5k">€2k–€5k</option>
          <option value="€5k–€10k">€5k–€10k</option>
          <option value="€10k+">€10k+</option>
        </select>

        <select
          name="timeline"
          className="w-full p-3 bg-zinc-900 border border-zinc-700"
          defaultValue="ASAP"
        >
          <option value="ASAP">ASAP</option>
          <option value="1–2 months">1–2 months</option>
          <option value="3+ months">3+ months</option>
        </select>

        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-white text-black px-6 py-3 font-semibold"
        >
          {status === "sending" ? "Sending…" : "Submit"}
        </button>

        {status === "done" && (
          <p className="text-green-400">Submitted successfully ✅</p>
        )}
        {status === "error" && (
          <p className="text-red-400">Submission failed ❌</p>
        )}
      </form>
    </main>
  );
}