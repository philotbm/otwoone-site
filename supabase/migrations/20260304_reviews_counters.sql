-- OTwoOne OS v1.14.1
-- Add review counters to projects.
-- reviews_included: how many client review rounds are contractually included (hub-editable).
-- reviews_used: auto-incremented each time project_status transitions INTO 'revisions'.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS reviews_included integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS reviews_used     integer NOT NULL DEFAULT 0;
