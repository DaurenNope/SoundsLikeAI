create table persona_reports (
  id           uuid        primary key default uuid_generate_v4(),
  persona_id   uuid        not null references personas(id) on delete cascade,
  user_id      uuid        not null references profiles(id) on delete cascade,
  report       jsonb       not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  constraint persona_reports_report_not_empty check (jsonb_typeof(report) = 'object')
);

create unique index persona_reports_persona_unique
  on persona_reports (persona_id);

create index persona_reports_user_idx
  on persona_reports (user_id);

alter table persona_reports enable row level security;

create policy "own persona reports" on persona_reports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
