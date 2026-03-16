create table published_posts (
  id              uuid          primary key default uuid_generate_v4(),
  draft_id        uuid          not null unique references drafts(id) on delete restrict,
  persona_id      uuid          not null references personas(id) on delete cascade,
  user_id         uuid          not null references profiles(id) on delete cascade,
  platform        platform_type not null,
  external_id     text,
  published_at    timestamptz   not null default now(),
  screenshot_path text,
  engagement      jsonb         not null default '{}'
);

alter table published_posts enable row level security;

create policy "own published" on published_posts
  for select using (auth.uid() = user_id);
