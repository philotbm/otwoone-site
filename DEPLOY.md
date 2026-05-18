# OTwoOne — Deploy

The site is a Next.js 16 marketing site deployed to Vercel. There is no database. The `/elevate` form sends two emails via Resend (one to `info@otwoone.ie`, one autoresponder to the enquirer) — that's the whole backend.

## Environment variables

Required in **both** Vercel Preview and Production:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key for sending the notification + autoresponder emails |
| `ELEVATE_NOTIFY_EMAIL` | Internal address that receives new lead notifications (`info@otwoone.ie`) |
| `NEXT_PUBLIC_SITE_URL` | Full site URL used in absolute links and metadata (e.g. `https://www.otwoone.ie`) |
| `RESEND_WEBHOOK_SECRET` | Signing secret for the Resend webhook (Pro plan). Set in Resend dashboard. |

Both Resend and the verified sending domain (`otwoone.ie` / `noreply@otwoone.ie`) need to be configured in the Resend dashboard before the form can send.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the three vars above
npm run dev                  # http://localhost:3000
```

Manual smoke before pushing:

```bash
npm run check                # typecheck + build
```

## Vercel deploy

1. Push your branch — Vercel builds a preview automatically.
2. Confirm preview URL renders home, `/services`, `/pricing`, `/elevate`, and the seven `/work/*` case studies.
3. Submit a test enquiry on the preview `/elevate` form. Confirm:
   - The autoresponder arrives at the test email address.
   - The internal notification arrives at `ELEVATE_NOTIFY_EMAIL` with the structured sections (Contact, Engagement, Clarifier Answers, Client Request, Internal Scoring).
4. Merge to `main`. Vercel auto-deploys to production.

## Rollback

```bash
git revert HEAD
git push origin main
```

Or in the Vercel dashboard: Deployments → previous deployment → Promote to Production.

## Lead handling

Lead notifications land in `info@otwoone.ie` and are processed by Cowork on a daily 7am sweep (see `outputs/otwoone-morning-leads-task.md` for the task spec). Drafts land in `_leads/` in this repo (gitignored). The day rate is anchored internally; no rates are published on the site.

## Webhook setup (one-off, after first deploy)

1. In the Resend dashboard, go to Webhooks -> Add Endpoint.
2. Endpoint URL: `https://www.otwoone.ie/api/resend/webhook` (use the preview URL when testing).
3. Subscribe to events: `email.opened`, `email.clicked`, `email.bounced`, `email.complained`. Leave the others off -- they are noise at our volume.
4. Copy the signing secret (`whsec_...`) into Vercel as `RESEND_WEBHOOK_SECRET` (both Preview and Production envs) and into local `.env.local`.
5. From the Resend webhook detail page, send a test event. Confirm it returns `200` and an `Engagement | ...` email lands at `info@otwoone.ie`.

