create table voice_samples (
  id              uuid                not null default uuid_generate_v4(),
  persona_id      uuid                not null references personas(id) on delete cascade,
  user_id         uuid                not null references profiles(id) on delete cascade,
  content         text                not null,
  platform        platform_type,
  source          voice_sample_source not null default 'manual',
  embedding       vector(384),
  created_at      timestamptz         not null default now(),
  constraint content_min_length check (char_length(trim(content)) >= 10),
  constraint content_max_length check (char_length(content) <= 5000)
);

create index voice_samples_embedding_idx
  on voice_samples using ivfflat (embedding vector_cosine_ops)
  with (lists=100)
  where embedding is not null;

create index voice_samples_persona_source_idx
  on voice_samples (persona_id, source, created_at desc);

alter table voice_samples enable row level security;

create policy "own voice samples" on voice_samples
  for select using (auth.uid() = user_id);
