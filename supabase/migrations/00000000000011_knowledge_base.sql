create table knowledge_base (
  id              uuid                 primary key default uuid_generate_v4(),
  source_type     knowledge_source_type not null,
  source_name     text                 not null,
  source_author   text,
  chunk_index     integer              not null,
  content         text                 not null,
  embedding       vector(384),
  metadata        jsonb                not null default '{}',
  is_global       boolean              not null default true,
  user_id         uuid                 references profiles(id) on delete cascade,
  created_at      timestamptz          not null default now(),
  constraint content_not_empty check (char_length(trim(content)) > 0),
  constraint content_max check (char_length(content) <= 3000),
  constraint chunk_index_positive check (chunk_index >= 0)
);

create index knowledge_base_embedding_idx
  on knowledge_base using ivfflat (embedding vector_cosine_ops)
  with (lists=200)
  where embedding is not null;

create index knowledge_base_source_idx
  on knowledge_base (source_type, source_name, chunk_index);

alter table knowledge_base enable row level security;

create policy "global knowledge" on knowledge_base
  for select using (is_global = true or auth.uid() = user_id);
