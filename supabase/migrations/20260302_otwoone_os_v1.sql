-- OTwoOne Operating System v1
-- Replaces intake_submissions with a structured lifecycle system
-- Tables: leads, lead_details, projects, subscriptions

-- ─── leads ────────────────────────────────────────────────────────────────────

create table if not exists leads (
  id                         uuid primary key default gen_random_uuid(),
  created_at                 timestamptz default now(),
  source                     text default 'elevate',

  -- Lifecycle status (pre-conversion stages)
  status                     text check (status in (
    'lead_submitted',
    'discovery_active',
    'proposal_sent',
    'lost_pre_deposit',
    'converted'
  )) default 'lead_submitted',

  -- Contact
  contact_name               text,
  contact_email              text not null,
  company_name               text,
  company_website            text,
  role                       text,
  decision_authority         text check (decision_authority in ('yes', 'shared', 'no')),

  -- Engagement
  engagement_type            text,
  budget                     text,
  timeline                   text,

  -- Internal assessments (editable in hub)
  go_no_go                   boolean,
  discovery_depth            text check (discovery_depth in ('lite', 'core', 'deep')),

  -- Server-computed scores
  clarity_score              smallint,
  alignment_score            smallint,
  complexity_score           smallint,
  authority_score            smallint,
  total_score                numeric(4,1),
  discovery_depth_suggested  text check (discovery_depth_suggested in ('lite', 'core', 'deep')),

  -- Pre-conversion settings (proposed, defaults for conversion modal)
  proposed_hosting_required  boolean default true,
  proposed_maintenance_plan  text check (proposed_maintenance_plan in (
    'essential', 'growth', 'accelerator', 'none'
  ))
);

-- ─── lead_details ─────────────────────────────────────────────────────────────

create table if not exists lead_details (
  lead_id             uuid primary key references leads(id) on delete cascade,
  raw_submission      jsonb,
  clarifier_answers   jsonb,
  success_definition  text,
  internal_notes      text
);

-- ─── projects ─────────────────────────────────────────────────────────────────

create table if not exists projects (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz default now(),
  lead_id                 uuid references leads(id),

  project_status          text check (project_status in (
    'project_setup_complete',
    'build_active',
    'delivered'
  )),

  hosting_required        boolean default true,

  maintenance_plan        text check (maintenance_plan in (
    'essential',
    'growth',
    'accelerator',
    'none'
  )),

  maintenance_status      text check (maintenance_status in (
    'pending',
    'active',
    'suspended',
    'cancelled'
  )),

  delivery_completed_at   timestamptz,

  -- SharePoint folder (created on conversion)
  sharepoint_folder_url   text,
  sharepoint_folder_error text
);

-- ─── subscriptions ────────────────────────────────────────────────────────────

create table if not exists subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid references projects(id),
  plan                  text,
  monthly_amount        numeric,
  status                text check (status in (
    'active',
    'past_due',
    'suspended',
    'cancelled'
  )),
  stripe_subscription_id text,
  current_period_end    timestamptz,
  past_due_since        timestamptz,
  created_at            timestamptz default now()
);
