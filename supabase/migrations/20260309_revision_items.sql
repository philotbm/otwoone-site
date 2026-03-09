-- OTwoOne OS v1.57.0 — Revision Execution Loop
-- Adds: revision_items table for structured operator-owned revision tracking.
--
-- Safety notes:
--   • Uses CREATE TABLE IF NOT EXISTS — safe to re-run.
--   • No existing tables modified.
--   • Feedback linkage is via nullable feedback_event_id referencing
--     project_events.id (portal feedback is stored as project_events).

CREATE TABLE IF NOT EXISTS revision_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feedback_event_id uuid        REFERENCES project_events(id) ON DELETE SET NULL,
  revision_type     text        NOT NULL DEFAULT 'other'
                    CHECK (revision_type IN ('copy','design','feature','bug','other')),
  title             text        NOT NULL,
  description       text        NOT NULL DEFAULT '',
  status            text        NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','in_progress','complete')),
  priority          text        NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high')),
  batch_label       text,
  source            text        NOT NULL DEFAULT 'internal'
                    CHECK (source IN ('portal','email','internal')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS revision_items_project_id_idx
  ON revision_items (project_id);

CREATE INDEX IF NOT EXISTS revision_items_status_idx
  ON revision_items (project_id, status);

CREATE INDEX IF NOT EXISTS revision_items_batch_label_idx
  ON revision_items (project_id, batch_label)
  WHERE batch_label IS NOT NULL;

-- Auto-update updated_at (reuses the existing set_updated_at trigger function)
CREATE TRIGGER set_updated_at_revision_items
  BEFORE UPDATE ON revision_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
