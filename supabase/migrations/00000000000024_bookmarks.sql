create table bookmarks (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  persona_id  uuid        not null references personas(id) on delete cascade,
  platform    text        not null,
  url         text        not null,
  title       text,
  content     text,
  author      text,
  post_id     text,
  source_meta jsonb       not null default '{}'::jsonb,
  created_at  timestamptz,
  collected_at timestamptz not null default now(),
  constraint bookmarks_url_not_empty check (char_length(trim(url)) > 0)
);

create unique index bookmarks_unique_url
  on bookmarks (persona_id, platform, url);

create index bookmarks_persona_collected_idx
  on bookmarks (persona_id, collected_at desc);

alter table bookmarks enable row level security;

create policy "own bookmarks" on bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table fragments
  add column bookmark_id uuid references bookmarks(id) on delete set null;

create index fragments_bookmark_id_idx on fragments (bookmark_id);
