-- v1.90.0: Canonical Lifecycle + Meetings Table
-- 1. Migrate existing lead statuses to canonical lifecycle
-- 2. Create meetings table

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 1: Map old statuses to new canonical values
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop old constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Migrate existing values
UPDATE leads SET status = 'enquiry_received'   WHERE status = 'lead_submitted';
UPDATE leads SET status = 'scope_analysis'     WHERE status = 'scoping_sent';
UPDATE leads SET status = 'ready_for_proposal' WHERE status = 'scope_received';
-- proposal_sent stays the same
UPDATE leads SET status = 'deposit_requested'  WHERE status = 'deposit_received';
-- deposit_requested stays the same
UPDATE leads SET status = 'complete'           WHERE status = 'converted';
UPDATE leads SET status = 'enquiry_received'   WHERE status = 'lost_pre_deposit';

-- Add new constraint with canonical lifecycle
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'enquiry_received',
  'scope_analysis',
  'ready_for_proposal',
  'proposal_sent',
  'client_approved',
  'deposit_requested',
  'in_build',
  'client_review',
  'revisions',
  'final_approval',
  'full_payment_requested',
  'complete'
));

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 2: Create meetings table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meetings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stage         text NOT NULL,
  type          text NOT NULL,
  scheduled_at  timestamptz NOT NULL,
  completed_at  timestamptz,
  notes         text NOT NULL DEFAULT '',
  outcome       text,
  next_action_hint text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Constraints on allowed values
ALTER TABLE meetings ADD CONSTRAINT meetings_stage_check CHECK (stage IN (
  'scope_analysis', 'proposal_sent', 'in_build', 'client_review', 'final_approval'
));

ALTER TABLE meetings ADD CONSTRAINT meetings_type_check CHECK (type IN (
  'discovery_call', 'proposal_walkthrough', 'build_review', 'client_review_session', 'handover_call'
));

ALTER TABLE meetings ADD CONSTRAINT meetings_outcome_check CHECK (outcome IS NULL OR outcome IN (
  'scope_expanded', 'scope_reduced', 'no_change', 'ready_for_proposal',
  'proposal_approved', 'changes_requested', 'approved', 'blocked'
));

-- Index for fast lookups by lead
CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON meetings(lead_id);

-- Updated_at trigger (reuse pattern from leads)
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();
