"use client";

import Link from "next/link";
import { OTWOONE_OS_VERSION } from "@/lib/osVersion";

// ─── Section wrapper ─────────────────────────────────────────────────────────

function SOPSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
        {title}
      </h2>
      <div className="text-sm text-gray-300 leading-relaxed space-y-3 pl-4">
        {children}
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-white/5 text-[10px] font-bold text-indigo-400 flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Table of contents ──────────────────────────────────────────────────────

const TOC = [
  { id: "what-is-otwoone",   label: "What is OTwoOne OS" },
  { id: "lead-to-project",   label: "Lead \u2192 Project flow" },
  { id: "intake",            label: "Intake workflow" },
  { id: "project-context",   label: "Project context" },
  { id: "client-review",     label: "Client review portal" },
  { id: "revisions",         label: "Revision workflow" },
  { id: "execution-packs",   label: "Execution packs" },
  { id: "chatgpt-claude",    label: "ChatGPT \u2192 Claude Code" },
  { id: "output-review",     label: "Output \u0026 review loop" },
  { id: "operating-rules",   label: "Operating rules" },
];

// ─── Main page ──────────────────────────────────────────────────────────────

export default function SOPPage() {
  return (
    <div className="min-h-screen bg-[#05060a] text-gray-200">

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hub" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Hub
          </Link>
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-indigo-400">OTwoOne</p>
            <h1 className="text-lg font-semibold text-white">SOP Center</h1>
          </div>
        </div>
        <span className="text-[11px] text-gray-600">OTwoOne OS {OTWOONE_OS_VERSION}</span>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto">

        {/* Intro */}
        <div className="mb-10">
          <p className="text-sm text-gray-400 leading-relaxed">
            This page is the standard operating procedure guide for OTwoOne OS.
            If you are new to the team, read through each section to understand how the system works end to end.
            The goal is to remove tribal knowledge and make the workflow understandable by anyone.
          </p>
        </div>

        {/* Table of contents */}
        <nav className="mb-10 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 font-medium">Contents</p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {TOC.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-xs text-gray-400 hover:text-indigo-300 transition-colors flex items-center gap-2"
                >
                  <span className="text-[10px] text-gray-600 w-4 text-right">{i + 1}.</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-10">

          <SOPSection id="what-is-otwoone" title="What is OTwoOne OS">
            <p>
              OTwoOne OS is the internal operating system for managing client projects from first enquiry through to delivery and ongoing maintenance.
              It handles lead management, project conversion, client intake, review cycles, revision tracking, and AI-assisted implementation.
            </p>
            <p>
              The Hub is the central dashboard where operators manage all active leads and projects.
              Every lead, project, and client interaction is tracked in the Hub.
            </p>
            <p>
              The system is built on Next.js with Supabase as the database layer. All operator actions are logged as project events for audit and visibility.
            </p>
          </SOPSection>

          <SOPSection id="lead-to-project" title="Lead → Project flow">
            <p>Every client engagement starts as a lead and progresses through defined stages:</p>
            <Step n={1}>
              <p><strong>Enquiry submitted</strong> — A potential client fills in the intake form. The system scores the lead automatically on clarity, alignment, complexity, and authority.</p>
            </Step>
            <Step n={2}>
              <p><strong>Scoping sent</strong> — The operator sends a scoping template email asking for specifics (pages needed, examples, deadline, integrations).</p>
            </Step>
            <Step n={3}>
              <p><strong>Scope received</strong> — The client responds with scope details. Operator reviews and prepares a proposal.</p>
            </Step>
            <Step n={4}>
              <p><strong>Proposal sent</strong> — The operator sends the proposal and pricing to the client.</p>
            </Step>
            <Step n={5}>
              <p><strong>Deposit requested / received</strong> — Once agreed, a deposit is requested and confirmed.</p>
            </Step>
            <Step n={6}>
              <p><strong>Converted</strong> — After deposit is received, the lead is converted to a project. This creates a project record, triggers SharePoint folder creation, and sets up the project lifecycle.</p>
            </Step>
            <p className="text-xs text-gray-500 italic">
              Leads can also be marked as &quot;Lost&quot; at any pre-deposit stage.
            </p>
          </SOPSection>

          <SOPSection id="intake" title="Intake workflow">
            <p>
              Once a lead is converted to a project, the operator sends the client an intake portal link.
              This is a multi-step form where the client provides business and brand information.
            </p>
            <Step n={1}>
              <p><strong>Send portal link</strong> — In the Hub project section, click &quot;Send portal link&quot;. This emails the client a unique link to the intake portal.</p>
            </Step>
            <Step n={2}>
              <p><strong>Client fills intake</strong> — The client completes 3 steps: Basics (contact info, goals), Brand (headline, services, about, CTA), and optionally a third step for additional details.</p>
            </Step>
            <Step n={3}>
              <p><strong>Review intake</strong> — In the Hub, click &quot;View intake&quot; under the Project section to see what the client submitted. Use this to inform the build.</p>
            </Step>
            <p className="text-xs text-gray-500 italic">
              The intake status is tracked: not sent → sent → in progress → complete.
            </p>
          </SOPSection>

          <SOPSection id="project-context" title="Project context workflow">
            <p>
              Each project has a canonical context record — this is the internal source of truth for what the project is, what stack it uses, and what constraints apply.
            </p>
            <p>
              The project context is used by execution pack generation to produce AI-ready prompts.
              Fill it in early and update it as the project evolves.
            </p>
            <Step n={1}>
              <p><strong>Open the project</strong> — Navigate to the lead detail page in the Hub and scroll to the Project Context section.</p>
            </Step>
            <Step n={2}>
              <p><strong>Fill in the fields</strong> — Business summary, project summary, current stack, key URLs, constraints, AI notes, and acceptance notes. These do not need to be long — a few sentences each is fine.</p>
            </Step>
            <Step n={3}>
              <p><strong>Save</strong> — Click &quot;Save context&quot;. The context is stored and will be included in all future execution packs.</p>
            </Step>
            <p className="text-xs text-gray-500 italic">
              This is not the same as the client intake. The intake is what the client tells us. The context is what we (the operators) know about the project.
            </p>
          </SOPSection>

          <SOPSection id="client-review" title="Client review portal workflow">
            <p>
              When a deliverable is ready for client feedback, the project status is moved to &quot;Client review&quot;.
              The client can then submit feedback through the review portal.
            </p>
            <Step n={1}>
              <p><strong>Move to client review</strong> — Use the lifecycle stepper or project status dropdown to set the project to &quot;client_review&quot;.</p>
            </Step>
            <Step n={2}>
              <p><strong>Client submits feedback</strong> — The client uses their portal link to approve, request revisions, or request a meeting. Each feedback submission is logged as a project event.</p>
            </Step>
            <Step n={3}>
              <p><strong>Review feedback in Timeline</strong> — Feedback events appear in the Timeline section of the lead detail page with the client&apos;s message, category, and priority.</p>
            </Step>
            <p className="text-xs text-gray-500 italic">
              The number of included review rounds is configurable per project (default: 2). Once exhausted, the system blocks advancing to further review rounds.
            </p>
          </SOPSection>

          <SOPSection id="revisions" title="Revision workflow">
            <p>
              Revision items are individual change requests that need to be implemented.
              They can come from the client review portal, email, or be created manually.
            </p>
            <Step n={1}>
              <p><strong>Create revisions</strong> — Either click &quot;Create revision →&quot; on a feedback event in the Timeline, or use the &quot;+ Add revision&quot; button in the Revisions section. Set the type, priority, and source.</p>
            </Step>
            <Step n={2}>
              <p><strong>Triage</strong> — Review each revision item. Update the status (queued → in progress → complete), adjust priority, and assign batch labels if grouping.</p>
            </Step>
            <Step n={3}>
              <p><strong>Track progress</strong> — The Revisions section shows all items with their current status. Use status dropdowns inline to update as work progresses.</p>
            </Step>
            <p className="text-xs text-gray-500 italic">
              Revision types: Copy, Design, Feature, Bug, Other. Priorities: High, Medium, Low. Sources: Portal, Email, Internal.
            </p>
          </SOPSection>

          <SOPSection id="execution-packs" title="Execution pack workflow">
            <p>
              Execution packs combine project context with active revision items into a structured payload.
              They are the bridge between triage and implementation.
            </p>
            <Step n={1}>
              <p><strong>Ensure context is filled</strong> — Before generating a pack, make sure the Project Context section has up-to-date information.</p>
            </Step>
            <Step n={2}>
              <p><strong>Triage revisions</strong> — Make sure revision items are correctly categorised, prioritised, and that incomplete items are marked as queued or in progress.</p>
            </Step>
            <Step n={3}>
              <p><strong>Generate pack</strong> — Click &quot;Generate pack&quot; in the Revisions section. This creates an execution pack that includes project context + all active revision items, grouped by type.</p>
            </Step>
            <Step n={4}>
              <p><strong>Use the prompt outputs</strong> — The pack generates two copy-ready prompts: ChatGPT Architect and Claude Code. Use these to run the AI workflow (see next section).</p>
            </Step>
          </SOPSection>

          <SOPSection id="chatgpt-claude" title="ChatGPT → Claude Code workflow">
            <p>
              The standard AI implementation workflow uses two steps: architecture then execution.
            </p>
            <Step n={1}>
              <p><strong>Copy the ChatGPT Architect prompt</strong> — From the execution pack output, select the &quot;ChatGPT Architect&quot; tab and click Copy. Paste this into ChatGPT.</p>
            </Step>
            <Step n={2}>
              <p><strong>ChatGPT produces a plan</strong> — ChatGPT analyses the revision items and produces a structured implementation plan with file changes, steps, and dependencies.</p>
            </Step>
            <Step n={3}>
              <p><strong>Copy the Claude Code prompt</strong> — From the execution pack output, select the &quot;Claude Code&quot; tab and click Copy.</p>
            </Step>
            <Step n={4}>
              <p><strong>Combine and execute</strong> — Paste the Claude Code prompt into Claude Code, along with the implementation plan from ChatGPT. Claude Code executes the implementation directly in the codebase.</p>
            </Step>
            <Step n={5}>
              <p><strong>Review output</strong> — Check the implementation, run builds, and verify the changes match the revision requirements.</p>
            </Step>
            <p className="text-xs text-gray-500 italic">
              This two-step workflow ensures the implementation is both well-planned and correctly executed. ChatGPT handles strategy, Claude Code handles execution.
            </p>
          </SOPSection>

          <SOPSection id="output-review" title="Output report and review loop">
            <p>
              After each implementation cycle, the operator reviews the output and decides next steps.
            </p>
            <Step n={1}>
              <p><strong>Verify the implementation</strong> — Check that the build passes, TypeScript is clean, and the changes match the revision requirements.</p>
            </Step>
            <Step n={2}>
              <p><strong>Mark revisions complete</strong> — In the Revisions section, set completed items to &quot;Complete&quot; status.</p>
            </Step>
            <Step n={3}>
              <p><strong>Return to client review</strong> — If changes are ready for the client, move the project status back to &quot;Client review&quot; and notify the client.</p>
            </Step>
            <Step n={4}>
              <p><strong>Loop</strong> — If the client requests further revisions, create new revision items from their feedback and repeat the cycle: triage → pack → implement → review.</p>
            </Step>
          </SOPSection>

          <SOPSection id="operating-rules" title="Basic operating rules">
            <div className="space-y-2">
              <p><strong>1. Always log context.</strong> Keep the Project Context section up to date. This is what allows AI tools to work without re-explaining the project every time.</p>
              <p><strong>2. Triage before executing.</strong> Do not jump straight to implementation. Review revision items, set priorities, and generate a pack first.</p>
              <p><strong>3. Use the two-step AI workflow.</strong> ChatGPT for planning, Claude Code for execution. Do not skip the planning step.</p>
              <p><strong>4. Track everything.</strong> Every client interaction, revision, and status change should be visible in the Hub. Do not rely on memory or external notes.</p>
              <p><strong>5. Be conservative with changes.</strong> Implement only what is requested. Do not add speculative features or redesign unrelated areas.</p>
              <p><strong>6. Validate before shipping.</strong> Always run TypeScript checks and builds before committing. Never ship code that does not compile.</p>
              <p><strong>7. Respect review limits.</strong> Projects have a set number of included review rounds. If a client exceeds them, discuss additional scope before proceeding.</p>
              <p><strong>8. Version everything.</strong> Each release gets a version bump in osVersion.ts. This makes it easy to track what version is running in production.</p>
            </div>
          </SOPSection>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/5 text-center">
          <p className="text-[11px] text-gray-600">OTwoOne OS {OTWOONE_OS_VERSION} — SOP Center</p>
          <p className="text-[10px] text-gray-700 mt-1">
            Last updated with v1.58.0. This page is maintained in code — no CMS required.
          </p>
        </div>
      </div>
    </div>
  );
}
