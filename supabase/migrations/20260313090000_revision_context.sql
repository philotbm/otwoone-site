-- v1.75.0: Add revision_context to lead_briefs
-- Stores operator-entered revised information (changed requirements, call notes, etc.)
-- Used as a first-class upstream input for downstream workflow recomputation.

ALTER TABLE lead_briefs
  ADD COLUMN IF NOT EXISTS revision_context text;
