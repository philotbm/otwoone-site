-- ─── Clarification rounds ────────────────────────────────────────────────────
-- v1.59.1: dedicated clarification loop between scoping and proposal.
-- One lead → 0..N rounds. Each round tracks questions, client reply, and status.

create table if not exists lead_clarification_rounds (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads(id) on delete cascade,
  round_number  smallint not null default 1,
  status        text not null default 'draft'
                check (status in ('draft','sent','replied','closed')),
  questions     text,            -- operator-drafted clarification questions
  client_reply  text,            -- pasted client response
  generated_email text,          -- optional: email draft for operator to copy
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (lead_id, round_number)
);

-- Auto-update updated_at on change
create or replace trigger set_updated_at_clarification_rounds
  before update on lead_clarification_rounds
  for each row execute function set_updated_at();
