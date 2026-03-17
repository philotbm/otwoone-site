-- OTwoOne OS v1.85.1 — Backfill missing columns
-- Re-applies DDL from migrations that were tracked but not executed.
-- All statements use IF NOT EXISTS / IF NOT NULL guards — fully idempotent.

-- From 20260304110000_reviews_counters.sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS reviews_included integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS reviews_used     integer NOT NULL DEFAULT 0;

-- From 20260310110000_v1_24_0_pipeline_engine.sql — leads.stage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'stage'
  ) THEN
    ALTER TABLE leads ADD COLUMN stage text NOT NULL DEFAULT 'scoping'
      CHECK (stage IN ('lead','scoping','proposal','project_setup','build','delivery','growth','lost'));
    UPDATE leads SET stage = CASE
      WHEN status IN ('lead_submitted', 'scoping_sent', 'scope_received') THEN 'scoping'
      WHEN status IN ('proposal_sent', 'deposit_requested', 'deposit_received') THEN 'proposal'
      WHEN status = 'converted'        THEN 'project_setup'
      WHEN status = 'lost_pre_deposit' THEN 'lost'
      ELSE 'scoping'
    END;
  END IF;
END $$;

-- From 20260310110000_v1_24_0_pipeline_engine.sql — projects.stage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'stage'
  ) THEN
    ALTER TABLE projects ADD COLUMN stage text NOT NULL DEFAULT 'project_setup'
      CHECK (stage IN ('project_setup','build','delivery','growth'));
  END IF;
END $$;

-- From 20260310110000_v1_24_0_pipeline_engine.sql — expand project_status CHECK
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.projects'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%project_status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE projects DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE projects
    ADD CONSTRAINT projects_project_status_check
    CHECK (project_status IN (
      'enquiry', 'brief_complete', 'requirements', 'proposal_sent',
      'deposit_paid', 'intake_pending',
      'in_build', 'client_review', 'revisions', 'final_approval', 'complete'
    ));
END $$;

-- From 20260310110000_v1_24_0_pipeline_engine.sql — revenue fields
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_value   numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_amount  numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_amount    numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_paid_at   timestamptz;

-- From 20260310110000_v1_24_0_pipeline_engine.sql — plan_catalog
CREATE TABLE IF NOT EXISTS plan_catalog (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  plan_code     text        NOT NULL UNIQUE,
  plan_name     text        NOT NULL,
  category      text        NOT NULL DEFAULT 'maintenance',
  description   text,
  price_monthly numeric(8,2),
  price_yearly  numeric(8,2),
  sort_order    integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  is_public     boolean     NOT NULL DEFAULT true
);

INSERT INTO plan_catalog (plan_code, plan_name, category, description, price_monthly, sort_order)
VALUES
  ('starter_49', 'Starter', 'maintenance',
   'Hosting & SSL certificate, uptime monitoring, security updates. For landing page sites.', 49, 1),
  ('essential', 'Foundation', 'maintenance',
   'Hosting oversight, monthly security & platform updates, 1 hour minor edits, email support, monthly health report.', 99, 2),
  ('growth', 'Growth', 'maintenance',
   'Everything in Foundation plus up to 3 hours development per month, monthly analytics review, priority support, minor feature additions.', 199, 3),
  ('accelerator', 'Accelerator', 'maintenance',
   'Everything in Growth plus up to 8 hours development per month, monthly strategy call, SEO monitoring & recommendations, roadmap planning.', 299, 4)
ON CONFLICT (plan_code) DO NOTHING;

-- From 20260310110000_v1_24_0_pipeline_engine.sql — project_plans
CREATE TABLE IF NOT EXISTS project_plans (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_id       uuid        NOT NULL REFERENCES plan_catalog(id),
  custom_price  numeric(8,2),
  billing_cycle text        NOT NULL DEFAULT 'monthly'
                CHECK (billing_cycle IN ('monthly','yearly')),
  status        text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','paused','cancelled')),
  start_date    date,
  end_date      date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
