create table signal_items (
  id              uuid          primary key default uuid_generate_v4(),
  source_id       uuid          references radar_sources(id) on delete set null,
  persona_id      uuid          not null references personas(id) on delete cascade,
  user_id         uuid          not null references profiles(id) on delete cascade,
  title           text,
  content         text,
  url             text,
  embedding       vector(384),
  relevance_score integer,
  score_reasoning jsonb         not null default '{}',
  status          signal_status not null default 'raw',
  fetched_at      timestamptz   not null default now(),
  fetched_day     date          not null default now()::date,
  constraint score_range check (relevance_score is null or relevance_score between 0 and 100),
  constraint has_content check (
    (content is not null and char_length(trim(content)) > 0) or
    (title is not null and char_length(trim(title)) > 0)
  )
);

create unique index signal_items_no_duplicate_url
  on signal_items (persona_id, url, fetched_day)
  where url is not null;

create index signal_items_embedding_idx
  on signal_items using ivfflat (embedding vector_cosine_ops)
  with (lists=100)
  where embedding is not null;

create index signal_items_persona_status_score_idx
  on signal_items (persona_id, status, relevance_score desc);

create or replace function set_signal_item_fetched_day()
returns trigger as $$
begin
  new.fetched_day = (new.fetched_at at time zone 'UTC')::date;
  return new;
end;
$$ language plpgsql;

create trigger set_signal_items_fetched_day
  before insert or update of fetched_at on signal_items
  for each row execute function set_signal_item_fetched_day();

alter table signal_items enable row level security;

create policy "own signals" on signal_items
  for select using (auth.uid() = user_id);
