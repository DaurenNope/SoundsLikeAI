create table personas (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  name            text        not null,
  description     text,
  platforms       platform_type[] not null default '{}',
  posts_per_week  integer     not null default 3,
  active          boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint personas_name_not_empty check (char_length(trim(name)) > 0),
  constraint personas_posts_per_week_range check (posts_per_week between 1 and 21)
);

create trigger set_personas_updated_at
  before update on personas
  for each row execute function trigger_set_updated_at();

alter table personas enable row level security;

create policy "own personas" on personas
  for all using (auth.uid() = user_id);
