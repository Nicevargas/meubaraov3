
create table public.emotional_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  emotional_state text,
  emotional_weight int,
  desire text,
  need text,
  intention text,
  free_answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.emotional_assessments enable row level security;

create policy "Users view own assessment"
  on public.emotional_assessments for select
  to authenticated using (auth.uid() = user_id);

create policy "Users insert own assessment"
  on public.emotional_assessments for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users update own assessment"
  on public.emotional_assessments for update
  to authenticated using (auth.uid() = user_id);

create trigger emotional_assessments_set_updated_at
  before update on public.emotional_assessments
  for each row execute function public.set_updated_at();
