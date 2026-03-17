-- OTwoOne OS v1.85.0 — Deposit Activation
-- Adds deposit_reference to projects table for payment reference/note tracking.
-- The other deposit fields (deposit_amount, deposit_paid_at) already exist
-- from 20260310110000_v1_24_0_pipeline_engine.sql.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deposit_reference text;
