create table fragments (
  id                uuid            primary key default uuid_generate_v4(),
  persona_id        uuid            not null references personas(id) on delete cascade,
  user_id           uuid            not null references profiles(id) on delete cascade,
  type              fragment_type   not null,
  raw_content       text,
  source_url        text,
  file_path         text,
  embedding         vector(384),
  status            fragment_status not null default 'raw',
  signal_item_id    uuid            references signal_items(id) on delete set null,
  knowledge_chunk_id uuid           references knowledge_base(id) on delete set null,
  metadata          jsonb           not null default '{}',
  created_at        timestamptz     not null default now(),
  updated_at        timestamptz     not null default now(),
  constraint file_required check (
    type not in ('voice','image','document') or file_path is not null
  ),
  constraint url_required check (
    type != 'link' or (source_url is not null and char_length(trim(source_url)) > 0)
  ),
  constraint content_required check (
    type != 'text' or (raw_content is not null and char_length(trim(raw_content)) >= 1)
  )
);

create index fragments_embedding_idx
  on fragments using ivfflat (embedding vector_cosine_ops)
  with (lists=100)
  where embedding is not null;

create index fragments_persona_status_idx
  on fragments (persona_id, status, created_at desc);

create trigger set_fragments_updated_at
  before update on fragments
  for each row execute function trigger_set_updated_at();

alter table fragments enable row level security;

create policy "own fragments" on fragments
  for select using (auth.uid() = user_id);

create policy "own fragments insert" on fragments
  for insert with check (auth.uid() = user_id);
