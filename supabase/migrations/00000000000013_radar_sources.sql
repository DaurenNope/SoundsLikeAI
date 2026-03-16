create table radar_sources (
  id              uuid        primary key default uuid_generate_v4(),
  persona_id      uuid        not null references personas(id) on delete cascade,
  user_id         uuid        not null references profiles(id) on delete cascade,
  name            text        not null,
  url             text,
  type            source_type not null,
  active          boolean     not null default true,
  last_fetched    timestamptz,
  fetch_interval  interval    not null default '3 hours',
  config          jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint name_not_empty check (char_length(trim(name)) > 0),
  constraint min_interval check (fetch_interval >= interval '30 minutes'),
  constraint url_required_for_types check (
    type not in ('rss', 'youtube') or
    (url is not null and char_length(trim(url)) > 0)
  )
);

create trigger set_radar_sources_updated_at
  before update on radar_sources
  for each row execute function trigger_set_updated_at();

alter table radar_sources enable row level security;

create policy "own radar sources" on radar_sources
  for all using (auth.uid() = user_id);
