# OTwoOne OS v1 — Deployment Runbook

> **Scope:** Initial production deploy of OS v1 (Elevate form, Hub, scoring engine,
> smoke tests, updated_at activity tracking).
>
> **Migrations to apply (in order):**
> 1. `20260302_otwoone_os_v1.sql`
> 2. `20260303_add_updated_at.sql`

---

## A — Preconditions

Before deploying, confirm all of the following:

### A1. Supabase migrations

Two migration files exist in `supabase/migrations/`. They **must** be applied in
lexicographic order (which their filenames guarantee):

| # | File | Purpose |
|---|------|---------|
| 1 | `20260302_otwoone_os_v1.sql` | Creates `leads`, `lead_details`, `projects`, `subscriptions` tables |
| 2 | `20260303_add_updated_at.sql` | Adds `updated_at` column + auto-update trigger to `leads` and `projects` |

> ⚠️  Do not apply `20260303` before `20260302` — the second migration adds columns
> to tables the first migration creates.

### A2. Environment variables

The following vars must be set in **both** Vercel Preview and Production environments
before the first deploy.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side) |
| `RESEND_API_KEY` | ✅ | Resend email API key |
| `ELEVATE_NOTIFY_EMAIL` | ✅ | Internal address that receives new lead notifications |
| `HUB_SECRET` | ✅ | Password for Hub access (cookie + header auth) |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ optional | Full site URL used in hub email links (e.g. `https://www.otwoone.ie`) |
| `SHAREPOINT_TENANT_ID` | ⚠️ optional | SharePoint OAuth tenant |
| `SHAREPOINT_CLIENT_ID` | ⚠️ optional | SharePoint app registration client ID |
| `SHAREPOINT_CLIENT_SECRET` | ⚠️ optional | SharePoint app secret |
| `SHAREPOINT_SITE_ID` | ⚠️ optional | SharePoint site ID |
| `SHAREPOINT_DRIVE_ID` | ⚠️ optional | Document library drive ID for folder creation |

> SharePoint vars are optional — if absent, folder creation is skipped gracefully
> and the error is stored on the project row. All other functionality is unaffected.

Run the preflight check to verify vars before each stage:

```bash
pnpm preflight
```

---

## B — Apply Migrations

Choose **one** of the two methods below.

### B1. Supabase Dashboard (recommended for first deploy)

1. Open [Supabase Dashboard](https://app.supabase.com) → your project → **SQL Editor**.
2. Paste and run the contents of `supabase/migrations/20260302_otwoone_os_v1.sql`.
3. Confirm with `select count(*) from leads;` — should return `0` with no error.
4. Paste and run the contents of `supabase/migrations/20260303_add_updated_at.sql`.
5. Confirm: `select column_name from information_schema.columns where table_name = 'leads' and column_name = 'updated_at';` — should return one row.

### B2. Supabase CLI (`supabase db push`)

> Prerequisites: `supabase` CLI installed, project linked (`supabase link --project-ref <ref>`).

```bash
supabase db push
```

This applies all pending migrations in filename order automatically.

---

## C — Local Validation

### C1. Install and start

```bash
pnpm install
pnpm preflight          # confirm all required vars are in .env.local
pnpm dev                # starts on http://localhost:3000
```

### C2. Manual checks

| URL | Expected |
|-----|----------|
| `http://localhost:3000/elevate` | 4-step form loads without errors |
| `http://localhost:3000/hub/login` | Login form renders |
| `http://localhost:3000/hub` | Redirects to login if no session |

### C3. Smoke test

Open a second terminal (dev server must be running):

```bash
SMOKE_BASE_URL=http://localhost:3000 HUB_SECRET=<your_hub_secret> pnpm smoke
```

Expected output: `✅  All N steps passed`

### C4. Cleanup

```bash
SMOKE_BASE_URL=http://localhost:3000 HUB_SECRET=<your_hub_secret> pnpm smoke:cleanup
```

Removes all `SMOKE-*` leads and projects from the database.

---

## D — Vercel Preview Validation

### D1. Deploy preview

Push your branch to GitHub — Vercel will build and deploy a preview automatically:

```bash
git push origin <your-branch>
```

Wait for the Vercel build to succeed. The preview URL will be in the format:
`https://otwoone-site-<hash>-<team>.vercel.app`

### D2. Confirm env vars

In Vercel Dashboard → Project → Settings → Environment Variables, confirm all
required vars from Section A2 are set for the **Preview** environment.

### D3. Run preflight against preview

The preflight script checks your **local shell** vars. To confirm the Vercel preview
has them, check the Vercel dashboard directly — the script validates your local
`.env.local` only.

### D4. Run smoke against preview

```bash
SMOKE_BASE_URL=https://<preview-url>.vercel.app HUB_SECRET=<your_hub_secret> pnpm smoke
```

Expected: all steps pass. If any step fails, do **not** promote to production.

### D5. Cleanup

```bash
SMOKE_BASE_URL=https://<preview-url>.vercel.app HUB_SECRET=<your_hub_secret> pnpm smoke:cleanup
```

---

## E — Production Deploy

### E1. Merge to main

```bash
git checkout main
git merge <your-branch> --no-ff
git push origin main
```

Vercel will automatically build and deploy the production release.

### E2. Confirm production env vars

In Vercel Dashboard → Project → Settings → Environment Variables, confirm all
required vars are set for the **Production** environment.

### E3. Run production smoke

```bash
SMOKE_BASE_URL=https://www.otwoone.ie HUB_SECRET=<your_hub_secret> pnpm smoke
```

Expected: all steps pass.

### E4. Cleanup production smoke data

```bash
SMOKE_BASE_URL=https://www.otwoone.ie HUB_SECRET=<your_hub_secret> pnpm smoke:cleanup
```

> Always run cleanup after a production smoke. Smoke leads are prefixed `SMOKE-` and
> are safe to delete — they have no production data attached.

### E5. Final manual verification

| Check | How |
|-------|-----|
| Submit a test lead via `/elevate` | Confirm internal notification email arrives at `ELEVATE_NOTIFY_EMAIL` |
| Open `/hub` and log in | Confirm the test lead appears in the table |
| Open the lead detail page | Confirm scores and status display correctly |
| Convert the lead | Confirm project row created; SharePoint folder creation logged on project row |

---

## F — Rollback Notes

### If smoke fails on preview

1. **Do not promote to production.**
2. Check Vercel build logs for runtime errors.
3. Verify all required env vars are set in the Preview environment (Section A2).
4. Verify both migrations were applied to the database (Section B).
5. Run `pnpm smoke:cleanup` to remove any partial test data.
6. Fix the issue on the branch, push again — Vercel will rebuild the preview automatically.

### If smoke fails on production

1. **Do not merge further changes.**
2. Identify the failing step from the smoke output.

   | Failing step | Likely cause |
   |---|---|
   | Create leads | Supabase unreachable or migration not applied |
   | Hub list check | `HUB_SECRET` mismatch or middleware issue |
   | Convert lead | `leads.status` constraint or `projects` table missing |
   | Project → delivered + maintenance | `updated_at` trigger not applied (run migration 20260303) |
   | Any auth step | `HUB_SECRET` env var not set in production |

3. If caused by a bad deploy, revert via Vercel Dashboard → Deployments → previous
   deployment → **Promote to Production**, or:

   ```bash
   git revert HEAD
   git push origin main
   ```

4. If caused by a missing migration, apply it via the Supabase SQL editor (Section B1)
   without reverting the deploy — the app is backwards-compatible with the missing
   column (it will just show `null` for `updated_at`).

5. Run cleanup after any failed smoke attempt:

   ```bash
   SMOKE_BASE_URL=https://www.otwoone.ie HUB_SECRET=<your_hub_secret> pnpm smoke:cleanup
   ```

---

## Quick reference

```
pnpm preflight                                          # check env vars
pnpm dev                                                # local dev server
pnpm smoke:cleanup                                      # remove smoke test data
pnpm build                                              # production build check

# Smoke — replace URL and secret as appropriate
SMOKE_BASE_URL=http://localhost:3000        HUB_SECRET=xxx pnpm smoke
SMOKE_BASE_URL=https://<preview>.vercel.app HUB_SECRET=xxx pnpm smoke
SMOKE_BASE_URL=https://www.otwoone.ie       HUB_SECRET=xxx pnpm smoke
```
