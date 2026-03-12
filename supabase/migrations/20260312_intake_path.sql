-- v1.61.0: Add intake_path column for state-driven workflow branching
ALTER TABLE lead_briefs
  ADD COLUMN IF NOT EXISTS intake_path text;
-- Valid values: 'clarification_email', 'discovery_call', 'proceed_to_brief', or NULL (not yet chosen)
