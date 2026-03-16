create table persona_opinions (
  id              uuid        primary key default uuid_generate_v4(),
  persona_id      uuid        not null references personas(id) on delete cascade,
  topic           text        not null,
  stance          text        not null,
  intensity       integer     not null default 5,
  raw_quote       text,
  embedding       vector(384),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint intensity_range check (intensity between 1 and 10)
);

create unique index persona_opinions_one_per_topic
  on persona_opinions (persona_id, lower(trim(topic)));

create index persona_opinions_embedding_idx
  on persona_opinions using ivfflat (embedding vector_cosine_ops)
  with (lists=50)
  where embedding is not null;

create trigger set_persona_opinions_updated_at
  before update on persona_opinions
  for each row execute function trigger_set_updated_at();

alter table persona_opinions enable row level security;

create policy "own opinions" on persona_opinions
  for all using (auth.uid() = (select user_id from personas where id = persona_id));
