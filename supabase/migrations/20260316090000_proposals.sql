-- ============================================================================
-- Proposal Engine Foundation — proposals + proposal_events
-- v1.80.0
-- ============================================================================

-- ── proposals ────────────────────────────────────────────────────────────────

create table if not exists proposals (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references leads(id) on delete cascade,
  version_number   int  not null default 1,
  is_current       boolean not null default true,

  -- Lifecycle status (independent of lead status)
  status           text not null default 'draft'
    check (status in (
      'draft', 'ready', 'sent', 'viewed', 'approved',
      'signed', 'deposit_requested', 'deposit_received', 'superseded'
    )),

  -- Identity / header
  title            text,
  client_name      text,
  client_company   text,
  prepared_for     text,
  prepared_by      text default 'OTwoOne',
  proposal_date    date,
  valid_until      date,

  -- Proposal content
  executive_summary   text,
  problem_statement   text,
  recommended_solution text,
  scope_items         jsonb default '[]'::jsonb,
  deliverables        jsonb default '[]'::jsonb,
  timeline_summary    text,
  timeline_phases     jsonb default '[]'::jsonb,

  -- Commercial
  build_price      numeric(10,2),
  deposit_percent  int default 50,
  deposit_amount   numeric(10,2),
  balance_amount   numeric(10,2),
  balance_terms    text default 'Due on project completion',
  running_costs    jsonb default '[]'::jsonb,
  optional_addons  jsonb default '[]'::jsonb,
  assumptions      jsonb default '[]'::jsonb,
  exclusions       jsonb default '[]'::jsonb,
  next_steps       jsonb default '[]'::jsonb,
  payment_notes    text,

  -- Acceptance / delivery
  acceptance_mode  text default 'email'
    check (acceptance_mode in ('email', 'signature', 'portal')),
  pdf_url          text,
  signing_url      text,
  view_token       text unique,

  -- Lifecycle timestamps
  sent_at              timestamptz,
  viewed_at            timestamptz,
  approved_at          timestamptz,
  signed_at            timestamptz,
  deposit_requested_at timestamptz,
  deposit_received_at  timestamptz,

  -- Versioning
  supersedes_proposal_id uuid references proposals(id),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Indexes
create index if not exists idx_proposals_lead_id on proposals(lead_id);
create index if not exists idx_proposals_lead_current on proposals(lead_id, is_current) where is_current = true;
create index if not exists idx_proposals_view_token on proposals(view_token) where view_token is not null;

-- Auto-update updated_at
create trigger set_proposals_updated_at
  before update on proposals
  for each row execute function set_updated_at();

-- Enforce one current proposal per lead
create unique index if not exists uq_proposals_one_current_per_lead
  on proposals(lead_id) where is_current = true;

-- ── proposal_events ──────────────────────────────────────────────────────────

create table if not exists proposal_events (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references proposals(id) on delete cascade,
  event_type   text not null
    check (event_type in (
      'created', 'updated', 'autofilled', 'pdf_generated',
      'sent', 'viewed', 'approved', 'signed',
      'deposit_requested', 'deposit_received', 'superseded'
    )),
  message      text not null default '',
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_proposal_events_proposal_id
  on proposal_events(proposal_id, created_at desc);
