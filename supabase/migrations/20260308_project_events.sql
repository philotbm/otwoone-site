-- OTwoOne — Project Events (audit trail)
-- One row per noteworthy action on a project.
-- Newest-first index for efficient hub timeline queries.
--
-- Safe for production:
--   • No existing tables affected.
--   • FK cascades on project delete.

create table if not exists project_events (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references projects(id) on delete cascade,
  event_type   text        not null,
  message      text        not null,
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists project_events_project_id_created_at_idx
  on project_events (project_id, created_at desc);
