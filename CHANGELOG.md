# OTwoOne Site Changelog

## v0.3.0 - 2026-05-14 - Lead engagement webhook

Resend Pro webhook integration. When a lead opens or clicks the autoresponder
(or it bounces / is marked as spam), a small "Engagement" notification email is
forwarded to info@otwoone.ie so Cowork's morning sweep picks up the signal in
the daily digest.

**Added**
- `POST /api/resend/webhook` - Svix-signed Resend webhook handler. Verifies
  signatures, filters to triage-relevant events (opened, clicked, bounced,
  complained), forwards a structured "Engagement" email to ELEVATE_NOTIFY_EMAIL.
- `RESEND_WEBHOOK_SECRET` env var (set in Resend dashboard, paste into Vercel).
- `svix` npm dependency for HMAC signature verification.

**Changed**
- `.env.example` rewritten ASCII-only and adds the new env var.
- `DEPLOY.md` adds the env var row and a webhook setup section.

**Notes**
- No new database or storage. Engagement events flow through the same
  inbox-as-system-of-record pattern as the rest of the site.
- Events received from emails sent *to* info@otwoone.ie (the internal lead
  notifications) are ignored -- we only track engagement with replies sent
  *to leads*.

---
## v0.2.0 — 2026-05-14 — CRM strip-out, email-only backend

Major simplification ahead of launch. The bespoke "OS" / Hub / proposals / portal
subsystems were removed. Lead handling moves to Cowork off the `info@otwoone.ie`
inbox; the only backend on the site is now `POST /api/elevate/submit` (sends
two emails via Resend — internal notification + autoresponder).

**Removed**
- Entire `/hub` admin UI (login, dashboard, lead detail, smoke, SOP)
- All `/api/hub/*` routes (31 endpoints covering briefs, proposals, revisions,
  clarifications, iterations, execution runs, meetings, project context)
- Client-facing `/projects/[token]` portal + `/proposal/[token]` viewer and
  their API routes
- All Supabase migrations and the `supabase/` directory — no database
- Lib modules: `proposalPdf`, `proposalAutofill`, `proposalSourceAssembly`,
  `proposalTypes`, `proposalEvents`, `projectEvents`, `projectStatus`,
  `leadStatus`, `contextQuality`, `sharepoint`, `osVersion`,
  `supabaseClient`, `supabaseServer`
- Smoke / preflight / deploy-check / SharePoint scripts
- Middleware (no `/hub` routes left to gate)
- npm deps: `@anthropic-ai/sdk`, `@react-pdf/renderer`, `@supabase/supabase-js`,
  `supabase` CLI

**Changed**
- `/api/elevate/submit` rewritten to email-only — no Supabase writes; computes
  triage scores in-memory for the email body; returns a short ref id
- `DEPLOY.md` rewritten as a minimal Vercel-deploy doc (was 263 lines of
  hub/smoke/Supabase setup)
- `README.md` replaced create-next-app boilerplate with a real overview
- `.env.example` added — only three required vars now: `RESEND_API_KEY`,
  `ELEVATE_NOTIFY_EMAIL`, `NEXT_PUBLIC_SITE_URL`
- Brand framing aligned on "Digital Solutions" across metadata, home, services,
  pricing, and proposal pages
- Canonical contact email is `info@otwoone.ie` everywhere (was inconsistent)

**Net effect**
- ~24,300 LOC → ~5,000 LOC
- 31 hub API routes → 2 (`/api/elevate/submit`, `/api/health`)
- 30+ Supabase migrations → 0
- Required env vars: 11 → 3
- No more Supabase, SharePoint, Anthropic SDK, or react-pdf dependencies

**Migration**
1. Run `scripts\cleanup-old-crm.ps1 -Apply` locally to delete the files this
   commit no longer references.
2. In Vercel, remove env vars: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HUB_SECRET`,
   all `SHAREPOINT_*`.
3. Optionally: delete the Supabase project — no longer used.

---

## v1.7.8 — 2026-03-04

- Convert endpoint now returns the real Supabase error message and details object on project creation failure
- Split combined `projectErr || !project` guard into two separate checks for clearer error surfacing
- Frontend receives structured `{ error, details }` payload instead of generic failure string
- Rollback of lead status preserved on Supabase error

## v1.7.7 — 2026-03-04

- Updated `Project` TypeScript type in hub lead detail page to reflect the 10-value lifecycle union
- Replaced stale `'project_setup_complete' | 'build_active' | 'delivered'` union with full allowed set
- Updated `PROJECT_STATUSES` UI dropdown array to match DB constraint exactly
- Resolved pre-existing merge conflict in `page.tsx` (preserved `CTA_LABELS` + `starter_49` plan)

## v1.7.6 — 2026-03-04

- Fixed smoke test DB writes: `'project_setup_complete'` → `'deposit_paid'`, `'build_active'` → `'in_build'`, `'delivered'` → `'complete'`
- Updated all adjacent smoke test comparisons to use new lifecycle values
- Fixed delivery logic in `PATCH /api/hub/projects/[id]`: trigger now fires on `'complete'` instead of dead `'delivered'` check
- `delivery_completed_at` and `maintenance_status: 'active'` now correctly set when project reaches `'complete'`
- Verified end-to-end via production smoke test: all 17 steps passed

## v1.7.5 — 2026-03-04

- Fixed Convert Lead failing in production with DB constraint violation
- Root cause: production DB constraint was updated to a 10-value lifecycle but code still inserted `'project_setup_complete'`
- Convert route now inserts `project_status: 'deposit_paid'` to match DB constraint
- Audited all `project_status` references across repo and flagged stale values

