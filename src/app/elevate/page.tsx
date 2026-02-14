"use client";

import { useState, FormEvent } from "react";

export default function ElevatePage() {
    const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus("sending");

        const form = new FormData(e.currentTarget);
        const answers = {
            budget: String(form.get("budget") ?? ""),
            timeline: String(form.get("timeline") ?? ""),
            goal: String(form.get("goal") ?? ""),
        };
        const payload = {
            contact_name: form.get("contact_name"),
            contact_email: form.get("contact_email"),
            company_name: form.get("company_name"),
            company_website: form.get("company_website"),
            answers: {
                goal: form.get("goal"),
                budget: form.get("budget"),
                timeline: form.get("timeline"),
            },
        };

        const res = await fetch("/api/elevate/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (res.ok) setStatus("done");
        else setStatus("error");
    }

    return (
        <main className="min-h-screen bg-black text-white p-10">
            <h1 className="text-3xl font-bold mb-6">OTwoOne Elevate Intake</h1>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">

                <input name="contact_name" placeholder="Your name" required className="w-full p-3 bg-zinc-900 border border-zinc-700" />
                <input name="contact_email" placeholder="Email" required className="w-full p-3 bg-zinc-900 border border-zinc-700" />
                <input name="company_name" placeholder="Company" className="w-full p-3 bg-zinc-900 border border-zinc-700" />
                <input name="company_website" placeholder="Website" className="w-full p-3 bg-zinc-900 border border-zinc-700" />

                <textarea name="goal" placeholder="What are you trying to achieve?" className="w-full p-3 bg-zinc-900 border border-zinc-700" />
                <select name="budget" className="w-full p-3 bg-zinc-900 border border-zinc-700">
                    <option>Under €2k</option>
                    <option>€2k–€5k</option>
                    <option>€5k–€10k</option>
                    <option>€10k+</option>
                </select>

                <select name="timeline" className="w-full p-3 bg-zinc-900 border border-zinc-700">
                    <option>ASAP</option>
                    <option>1–2 months</option>
                    <option>3+ months</option>
                </select>

                <button
                    type="submit"
                    disabled={status === "sending"}
                    className="bg-white text-black px-6 py-3 font-semibold"
                >
                    {status === "sending" ? "Sending…" : "Submit"}
                </button>

                {status === "done" && <p className="text-green-400">Submitted successfully ✅</p>}
                {status === "error" && <p className="text-red-400">Submission failed ❌</p>}

            </form>
        </main>
    );
}