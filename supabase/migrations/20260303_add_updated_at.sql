-- OTwoOne OS v1 — Activity tracking
-- Adds updated_at to leads and projects with auto-update triggers.
--
-- NOTE: This file is intentionally dated 20260303 (one day after the OS v1
-- schema migration dated 20260302). This guarantees correct lexicographic
-- ordering when applying migrations to a fresh database — the tables must
-- exist before columns can be added to them.
--
-- Safe to re-run: all statements use IF NOT EXISTS / CREATE OR REPLACE /
-- DROP IF EXISTS guards.

-- ─── Add columns ──────────────────────────────────────────────────────────────

alter table leads
  add column if not exists updated_at timestamptz default now();

alter table projects
  add column if not exists updated_at timestamptz default now();

-- ─── Backfill existing rows ───────────────────────────────────────────────────

update leads
  set updated_at = created_at
  where updated_at is null;

update projects
  set updated_at = created_at
  where updated_at is null;

-- ─── Trigger function ─────────────────────────────────────────────────────────

create or replace function set_updated_at()
  returns trigger as $$
  begin
    new.updated_at = now();
    return new;
  end;
$$ language plpgsql;

-- ─── Trigger: leads ───────────────────────────────────────────────────────────

drop trigger if exists leads_set_updated_at on leads;

create trigger leads_set_updated_at
  before update on leads
  for each row
  execute procedure set_updated_at();

-- ─── Trigger: projects ────────────────────────────────────────────────────────

drop trigger if exists projects_set_updated_at on projects;

create trigger projects_set_updated_at
  before update on projects
  for each row
  execute procedure set_updated_at();
