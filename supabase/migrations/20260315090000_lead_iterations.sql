-- v1.77.0: Lead iterations — additive context tracking for analysis pipeline
-- Stores iteration entries (call notes, emails, documents) that feed into analysis recomputation

CREATE TABLE IF NOT EXISTS lead_iterations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('call', 'email', 'document', 'other')),
  source_date DATE NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lead-scoped queries ordered by creation time
CREATE INDEX IF NOT EXISTS idx_lead_iterations_lead_id ON lead_iterations(lead_id, created_at);
