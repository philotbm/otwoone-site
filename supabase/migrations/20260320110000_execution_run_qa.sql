-- Add QA gate columns to revision_execution_runs
ALTER TABLE revision_execution_runs
  ADD COLUMN IF NOT EXISTS qa_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (qa_status IN ('pending', 'passed', 'failed')),
  ADD COLUMN IF NOT EXISTS qa_notes TEXT NOT NULL DEFAULT '';
