create table signal_reviews (
  id          uuid        primary key default uuid_generate_v4(),
  signal_id   uuid        not null references signal_items(id) on delete cascade,
  persona_id  uuid        not null references personas(id) on delete cascade,
  user_id     uuid        not null references profiles(id) on delete cascade,
  score       integer     not null,
  decision    text        not null,
  reasons     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index signal_reviews_signal_idx on signal_reviews (signal_id);
create index signal_reviews_persona_idx on signal_reviews (persona_id, created_at desc);

alter table signal_reviews enable row level security;

create policy "own signal reviews" on signal_reviews
  for select using (auth.uid() = user_id);
