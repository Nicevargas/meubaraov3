create table public.guest_sessions (
  guest_session_id text primary key,
  message_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now()
);

alter table public.guest_sessions enable row level security;
-- No policies: only service_role (server) may read/write.
