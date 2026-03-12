-- OTwoOne OS v1.60.2 — Readiness Persistence
-- Adds: scope_ready and readiness_reason columns to lead_briefs.
--
-- Safety notes:
--   • Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS — safe to re-run.
--   • Both columns are nullable with no defaults.
--   • No existing data is modified.
--   • scope_ready values: true (ready), false (needs clarification), or null (never assessed).

ALTER TABLE lead_briefs
  ADD COLUMN IF NOT EXISTS scope_ready      boolean,
  ADD COLUMN IF NOT EXISTS readiness_reason text;
