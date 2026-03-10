-- OTwoOne OS v1.58.0 — Execution Packs + SOP Center
-- Adds: project_context table for canonical internal project execution context.
--
-- Safety notes:
--   • Uses CREATE TABLE IF NOT EXISTS — safe to re-run.
--   • No existing tables modified.
--   • One context record per project (UNIQUE constraint on project_id).
--   • All text fields are nullable — operator fills them incrementally.

CREATE TABLE IF NOT EXISTS project_context (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  business_summary  text,
  project_summary   text,
  current_stack     text,
  key_urls          text,
  constraints       text,
  ai_notes          text,
  acceptance_notes  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for FK lookups
CREATE INDEX IF NOT EXISTS project_context_project_id_idx
  ON project_context (project_id);

-- Auto-update updated_at (reuses the existing set_updated_at trigger function)
CREATE TRIGGER set_updated_at_project_context
  BEFORE UPDATE ON project_context
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
