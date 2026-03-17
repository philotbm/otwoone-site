-- v1.86.1: Persist complexity engine result to lead_briefs
-- Eliminates flash-of-hidden-content on reload for fully-analysed leads.
-- Complexity result is stored as jsonb alongside technical_research.

ALTER TABLE lead_briefs
  ADD COLUMN IF NOT EXISTS complexity_result jsonb;
