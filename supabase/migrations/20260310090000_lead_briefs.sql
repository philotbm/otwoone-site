-- OTwoOne OS v1.59.0 — Project Brief Engine
-- Adds: lead_briefs table for pre-project scoping analysis and brief records.
--
-- Safety notes:
--   • Uses CREATE TABLE IF NOT EXISTS — safe to re-run.
--   • No existing tables modified.
--   • One brief record per lead (UNIQUE constraint on lead_id).
--   • All text fields are nullable — operator fills them incrementally.
--   • FK cascades on lead delete.

CREATE TABLE IF NOT EXISTS lead_briefs (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                uuid        NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  scoping_reply          text,
  project_summary        text,
  project_type           text,
  recommended_solution   text,
  suggested_pages        text,
  suggested_features     text,
  suggested_integrations text,
  timeline_estimate      text,
  budget_positioning     text,
  risks_and_unknowns     text,
  follow_up_questions    text,
  proposal_draft         text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Index for FK lookups
CREATE INDEX IF NOT EXISTS lead_briefs_lead_id_idx
  ON lead_briefs (lead_id);

-- Auto-update updated_at (reuses the existing set_updated_at trigger function)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_lead_briefs'
  ) THEN
    CREATE TRIGGER set_updated_at_lead_briefs
      BEFORE UPDATE ON lead_briefs
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
