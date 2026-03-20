-- Revision execution runs: stores Claude Code OUTPUT REPORTS against revision batches
CREATE TABLE IF NOT EXISTS revision_execution_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES lead_revisions(id) ON DELETE CASCADE,
  batch_index INT NOT NULL,
  output_report TEXT NOT NULL,
  operator_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revision_execution_runs_rev_batch
  ON revision_execution_runs (revision_id, batch_index);
