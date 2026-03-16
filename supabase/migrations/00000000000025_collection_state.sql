create table collection_state (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references profiles(id) on delete cascade,
  persona_id   uuid        not null references personas(id) on delete cascade,
  platform     text        not null,
  last_post_id text,
  last_run_at  timestamptz not null default now()
);

create unique index collection_state_unique_platform
  on collection_state (user_id, persona_id, platform);

alter table collection_state enable row level security;

create policy "own collection state" on collection_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
