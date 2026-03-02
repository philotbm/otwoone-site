# OTwoOne OS v1 — Smoke Test

Lightweight end-to-end check covering the full lifecycle:
**Elevate → Lead → Hub → Convert → Project → Delivered → Maintenance activation**

No Playwright, no Cypress. Just a single API endpoint and a Node script.

---

## What it tests

| Step | What's asserted |
|---|---|
| Create 4 test leads (A–D) | DB insert succeeds, scores computed, `discovery_depth_suggested` correct per scenario |
| Verify DB inserts | Score fields non-null, expected depth per scenario, `lead_details` row exists |
| Hub list | All created leads appear via Supabase query |
| PATCH Scenario A | `status`, `go_no_go`, `discovery_depth` all persist correctly |
| Convert Scenario A | `lead.status = converted`, project row created with correct `project_status / maintenance_status / maintenance_plan` |
| SharePoint non-blocking | Conversion passes even if `SHAREPOINT_DRIVE_ID` is absent |
| Project → `build_active` | Status transition persists |
| Project → `delivered` | `delivery_completed_at` set, `maintenance_status = active` (because `hosting_required = true`) |
| Negative guard | `hosting=true + plan=none` is correctly rejected before any DB write |
| Scenario B untouched | Lead B was never converted — confirms isolation |

---

## Required env vars

| Variable | Where | Notes |
|---|---|---|
| `SMOKE_BASE_URL` | `.env.local` or shell | e.g. `http://localhost:3000` or Vercel preview URL |
| `HUB_SECRET` | `.env.local` | Must match the running server's `HUB_SECRET` |
| `NEXT_PUBLIC_SUPABASE_URL` | server `.env.local` | Already required by the app |
| `SUPABASE_SERVICE_ROLE_KEY` | server `.env.local` | Already required by the app |

The smoke script authenticates via the `x-hub-secret` HTTP header (no cookie required).

SharePoint vars (`SHAREPOINT_*`) are **not** required for the smoke test to pass.

---

## Run locally

```bash
# 1. Start the dev server
pnpm dev

# 2. In a second terminal, run the smoke test
SMOKE_BASE_URL=http://localhost:3000 pnpm smoke

# Or add to .env.local:
#   SMOKE_BASE_URL=http://localhost:3000
# then just:
pnpm smoke
```

Expected output (all passing):
```
OTwoOne OS v1 — Smoke Test
Target: http://localhost:3000

   1  ✓  Create Scenario A: Build new — high budget, clear
   2  ✓  Create Scenario B: Improve existing — low budget
   3  ✓  Create Scenario C: Branding — low alignment
   4  ✓  Create Scenario D: Tech advice — vague, low clarity
   5  ✓  Verify DB Scenario A: scores + depth + details
   ...
  15  ✓  Negative guard: Scenario B lead untouched

  ✅  All 15 steps passed

  Created: 4 lead(s), 1 project(s)
  (Run 'pnpm smoke:cleanup' to remove test data)
```

---

## Run against Vercel Preview

```bash
# Using a preview URL (available after pushing a branch)
SMOKE_BASE_URL=https://otwoone-site-git-your-branch.vercel.app \
HUB_SECRET=yourpassword \
pnpm smoke
```

Or set both in `.env.local` and run `pnpm smoke`.

---

## Clean up test data

Smoke runs create leads with `company_name` prefixed `SMOKE-`. To remove them:

```bash
# CLI
pnpm smoke:cleanup

# Or via the Hub UI
# → /hub/smoke → "Clean Up Smoke Leads"
```

Cleanup deletes projects first (no cascade), then leads (lead_details cascade automatically).

---

## Hub UI

The smoke test also has a browser UI at `/hub/smoke` (protected by hub login):

- **Run Full Smoke Test** — runs all steps, shows PASS/FAIL per step with raw error messages
- **Clean Up Smoke Leads** — removes all SMOKE- rows from Supabase
- Expandable step rows with JSON detail
- Direct links to created leads in the Hub

---

## Scenario scoring expectations

| Scenario | Budget | Discovery depth | Notes |
|---|---|---|---|
| A — Build new | €15k–€40k | `deep` | High complexity, build_new type |
| B — Improve existing | Under €3k | `lite` | Low budget path |
| C — Branding | €3k–€5k | `lite` | Low budget, low alignment |
| D — Tech advice | Not sure | `deep` | Very low clarity (1 clarifier, vague def) |

---

## Notes

- Smoke runs do **not** send emails (Resend is bypassed entirely — DB inserted directly)
- Each run uses a unique timestamp suffix so multiple runs don't conflict
- The negative guard test is run inline (no DB write attempted)
- SharePoint folder creation errors are stored on the project row but do **not** fail the smoke test
