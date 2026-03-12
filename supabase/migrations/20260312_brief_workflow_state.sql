-- OTwoOne OS v1.60.1 — Brief workflow state persistence
-- Adds: override_scope_warning and contact_strategy columns to lead_briefs.
--
-- Safety notes:
--   • Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS — safe to re-run.
--   • Both columns are nullable with sensible defaults.
--   • No existing data is modified.
--   • contact_strategy values: 'bookings', 'teams', 'phone' (or null).

ALTER TABLE lead_briefs
  ADD COLUMN IF NOT EXISTS override_scope_warning boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_strategy       text;
