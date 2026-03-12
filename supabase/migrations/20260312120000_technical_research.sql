-- v1.69.0: Add technical research storage to lead_briefs
ALTER TABLE lead_briefs
  ADD COLUMN IF NOT EXISTS technical_research jsonb,
  ADD COLUMN IF NOT EXISTS technical_research_updated_at timestamptz;
