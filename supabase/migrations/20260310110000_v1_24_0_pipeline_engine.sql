-- OTwoOne OS v1.24.0 — Pipeline Engine Foundation
-- Adds: stage columns (leads + projects), intake_pending project status,
--       project revenue fields, plan_catalog table + seed, project_plans table.
--
-- Safety notes:
--   • All ADD COLUMN statements use IF NOT EXISTS — safe to re-run.
--   • Stage backfill uses a pure SQL UPDATE — no data loss possible.
--   • project_status CHECK expansion uses dynamic constraint lookup (same
--     pattern as 20260305_maintenance_plan_starter_49.sql).
--   • plan_catalog seed uses ON CONFLICT DO NOTHING — idempotent.

-- ─── 1. leads.stage ───────────────────────────────────────────────────────────
-- Pipeline stage for the lead. Tracks high-level bucket independent of the
-- granular status field. The two coexist: status drives day-to-day workflow,
-- stage drives pipeline reporting.
--
-- Valid stages (matches LEAD_STAGES in src/lib/pipelineStages.ts):
--   lead          — cold prospect, not yet in active discovery
--   scoping       — in discovery / scoping phase
--   proposal      — proposal written or under negotiation
--   project_setup — proposal won, project being set up (intake, deposit)
--   build         — active build work (unused at lead level; reserved)
--   delivery      — delivery / final sign-off (reserved)
--   growth        — post-delivery, ongoing engagement (reserved)
--   lost          — lost before deposit

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'scoping'
  CHECK (stage IN ('lead','scoping','proposal','project_setup','build','delivery','growth','lost'));

-- Backfill: derive stage from current status
UPDATE leads SET stage = CASE
  WHEN status IN ('lead_submitted', 'scoping_sent', 'scope_received') THEN 'scoping'
  WHEN status IN ('proposal_sent', 'deposit_requested', 'deposit_received') THEN 'proposal'
  WHEN status = 'converted'        THEN 'project_setup'
  WHEN status = 'lost_pre_deposit' THEN 'lost'
  ELSE 'scoping'
END;

-- ─── 2. projects.stage ────────────────────────────────────────────────────────
-- Pipeline stage for the project. Auto-updated by the PATCH API when
-- project_status changes (src/app/api/hub/projects/[id]/route.ts).
--
-- Valid stages (matches PROJECT_STAGES in src/lib/pipelineStages.ts):
--   project_setup — intake, deposit, onboarding
--   build         — active development, review, revisions
--   delivery      — final approval and hand-off
--   growth        — post-delivery maintenance engagement

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'project_setup'
  CHECK (stage IN ('project_setup','build','delivery','growth'));

-- Backfill: derive stage from current project_status
UPDATE projects SET stage = CASE
  WHEN project_status IN ('enquiry','brief_complete','requirements','proposal_sent',
                          'deposit_paid','intake_pending')    THEN 'project_setup'
  WHEN project_status IN ('in_build','client_review','revisions') THEN 'build'
  WHEN project_status IN ('final_approval','complete')            THEN 'delivery'
  ELSE 'project_setup'
END;

-- ─── 3. Add intake_pending to project_status CHECK ────────────────────────────
-- intake_pending is the new initial project status created by the Convert
-- (proposal-win) action. It replaces deposit_paid as the starting state —
-- deposit confirmation is now a separate step.
-- Uses dynamic constraint lookup to avoid hardcoding constraint names.

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
      'enquiry',
      'brief_complete',
      'requirements',
      'proposal_sent',
      'deposit_paid',
      'intake_pending',
      'in_build',
      'client_review',
      'revisions',
      'final_approval',
      'complete'
    ));
END $$;

-- ─── 4. Project revenue fields ────────────────────────────────────────────────
-- Supports the deposit + final payment model.
-- All nullable — populated manually as payments are received.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_value   numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_amount  numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_amount    numeric(10,2),
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_paid_at   timestamptz;

-- ─── 5. plan_catalog ──────────────────────────────────────────────────────────
-- Configuration source for all packages offered by OTwoOne.
-- Pricing lives here — never hardcoded in UI or API logic.
-- Seed data mirrors the plans advertised on the public website
-- (src/app/services/page.tsx, src/app/pricing/page.tsx).

CREATE TABLE IF NOT EXISTS plan_catalog (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  plan_code     text        NOT NULL UNIQUE,
  plan_name     text        NOT NULL,
  category      text        NOT NULL DEFAULT 'maintenance',
  description   text,
  price_monthly numeric(8,2),
  price_yearly  numeric(8,2),   -- NULL = no yearly option yet
  sort_order    integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  is_public     boolean     NOT NULL DEFAULT true
);

-- Seed: 4 maintenance/support plans from public site (prices in EUR)
INSERT INTO plan_catalog (plan_code, plan_name, category, description, price_monthly, sort_order)
VALUES
  ('starter_49',
   'Starter',
   'maintenance',
   'Hosting & SSL certificate, uptime monitoring, security updates. For landing page sites.',
   49, 1),
  ('essential',
   'Foundation',
   'maintenance',
   'Hosting oversight, monthly security & platform updates, 1 hour minor edits, email support, monthly health report.',
   99, 2),
  ('growth',
   'Growth',
   'maintenance',
   'Everything in Foundation plus up to 3 hours development per month, monthly analytics review, priority support, minor feature additions.',
   199, 3),
  ('accelerator',
   'Accelerator',
   'maintenance',
   'Everything in Growth plus up to 8 hours development per month, monthly strategy call, SEO monitoring & recommendations, roadmap planning.',
   299, 4)
ON CONFLICT (plan_code) DO NOTHING;

-- ─── 6. project_plans ─────────────────────────────────────────────────────────
-- Assigns a plan from plan_catalog to a specific project.
-- A project may have zero or one active plan at a time.
-- Allows custom_price override for bespoke pricing.
-- The existing projects.maintenance_plan text column is preserved for
-- backward compatibility; project_plans is the authoritative source going
-- forward and will be populated as plans are reassigned.

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
