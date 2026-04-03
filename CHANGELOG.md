# OTwoOne OS Changelog

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
