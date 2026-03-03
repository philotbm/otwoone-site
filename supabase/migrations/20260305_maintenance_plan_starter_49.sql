-- Migration: add starter_49 to maintenance plan CHECK constraints
-- Column type: TEXT (not enum) — drop and recreate CHECK constraints
-- Inspected via information_schema: both leads.proposed_maintenance_plan
-- and projects.maintenance_plan are TEXT with inline CHECK constraints.

DO $$
DECLARE
  cname text;
BEGIN
  -- 1. leads.proposed_maintenance_plan
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.leads'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%proposed_maintenance_plan%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE leads DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE leads
    ADD CONSTRAINT leads_proposed_maintenance_plan_check
    CHECK (proposed_maintenance_plan IN (
      'starter_49', 'essential', 'growth', 'accelerator', 'none'
    ));

  -- 2. projects.maintenance_plan (not the maintenance_status constraint)
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.projects'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%maintenance_plan%'
    AND pg_get_constraintdef(oid) NOT ILIKE '%maintenance_status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE projects DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE projects
    ADD CONSTRAINT projects_maintenance_plan_check
    CHECK (maintenance_plan IN (
      'starter_49', 'essential', 'growth', 'accelerator', 'none'
    ));
END $$;
