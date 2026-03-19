-- Lead Revisions: structured revision batches from client feedback
-- v1.87.0

create table if not exists lead_revisions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  raw_feedback text not null,
  structured_output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_revisions_lead_id on lead_revisions(lead_id);

-- Auto-update updated_at
drop trigger if exists lead_revisions_set_updated_at on lead_revisions;

create trigger lead_revisions_set_updated_at
  before update on lead_revisions
  for each row
  execute procedure set_updated_at();
