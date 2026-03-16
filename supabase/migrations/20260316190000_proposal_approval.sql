-- ============================================================================
-- v1.84.0 — Proposal Approval Flow
-- Adds approval fields to proposals for client approval persistence
-- ============================================================================

-- Add approval identity fields to proposals
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS approved_by_name    text,
  ADD COLUMN IF NOT EXISTS approved_by_company text;

-- Note: approved_at already exists on proposals table from initial schema
