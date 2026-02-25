-- Add project tracking columns to intake_submissions
-- Run once in the Supabase SQL editor: https://supabase.com/dashboard/project/alpoyyghqgotqeslmbfo/sql

ALTER TABLE intake_submissions
  ADD COLUMN IF NOT EXISTS project_sp_item_id TEXT,
  ADD COLUMN IF NOT EXISTS project_ref         TEXT,
  ADD COLUMN IF NOT EXISTS agreed_budget       NUMERIC;
