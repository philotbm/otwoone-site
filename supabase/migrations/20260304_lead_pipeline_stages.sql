-- OTwoOne OS v1.17.0: expand leads.status to full pre-deposit pipeline
-- Drops the old 5-value CHECK and replaces it with the 8-stage set.
-- Existing rows with 'discovery_active' remain valid until manually moved.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'lead_submitted',
  'scoping_sent',
  'scope_received',
  'proposal_sent',
  'deposit_requested',
  'deposit_received',
  'lost_pre_deposit',
  'converted'
));
