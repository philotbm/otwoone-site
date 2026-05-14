# OTwoOne

Marketing site for [otwoone.ie](https://www.otwoone.ie) — a Cork-based digital consultancy.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind 4
- Resend (transactional email)
- Hosted on Vercel

## Pages

| Path | What it is |
|------|------------|
| `/` | Home — pillars, process, differentiators, case study grid, contact |
| `/services` | Service categories and support plans |
| `/pricing` | Engagement types, "how every engagement starts", support plans |
| `/elevate` | 4-step intake wizard (engagement → clarifiers → context → contact) |
| `/work/<slug>` | Seven case study demos (medical, legal, store, restaurant, accountancy, fitness, fitness-app) |

## Backend

Single API route: `POST /api/elevate/submit`. Validates the submission, computes triage scores, sends a structured notification email to `ELEVATE_NOTIFY_EMAIL` (info@otwoone.ie) and an autoresponder to the enquirer. No database.

Lead follow-up is handled by Cowork off the `info@` inbox — see `DEPLOY.md` and the morning-sweep task in `outputs/otwoone-morning-leads-task.md`.

## Run locally

```bash
npm install
cp .env.example .env.local   # set RESEND_API_KEY, ELEVATE_NOTIFY_EMAIL, NEXT_PUBLIC_SITE_URL
npm run dev                  # http://localhost:3000
npm run check                # typecheck + production build
```

See `DEPLOY.md` for deploy notes.
