-- v1.78.0: Expand lead_iterations source_type to include meeting, client_reply, internal_note
ALTER TABLE lead_iterations
  DROP CONSTRAINT IF EXISTS lead_iterations_source_type_check;

ALTER TABLE lead_iterations
  ADD CONSTRAINT lead_iterations_source_type_check
  CHECK (source_type IN ('call', 'email', 'meeting', 'document', 'client_reply', 'internal_note', 'other'));
