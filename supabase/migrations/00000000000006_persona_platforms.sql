create table persona_platforms (
  id              uuid          primary key default uuid_generate_v4(),
  persona_id      uuid          not null references personas(id) on delete cascade,
  platform        platform_type not null,
  style_notes     text,
  taboos          text[]        not null default '{}',
  active          boolean       not null default true,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create unique index persona_platforms_one_per_platform
  on persona_platforms (persona_id, platform)
  where active = true;

alter table persona_platforms
  add constraint persona_platforms_taboos_no_empty
    check (array_position(taboos, '') is null);

create trigger set_persona_platforms_updated_at
  before update on persona_platforms
  for each row execute function trigger_set_updated_at();

alter table persona_platforms enable row level security;

create policy "own platforms" on persona_platforms
  for all using (auth.uid() = (select user_id from personas where id = persona_id));
