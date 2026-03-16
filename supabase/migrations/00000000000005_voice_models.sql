create table voice_models (
  id              uuid        primary key default uuid_generate_v4(),
  persona_id      uuid        not null references personas(id) on delete cascade,
  user_id         uuid        not null references profiles(id) on delete cascade,
  version         integer     not null default 1,
  profile         jsonb       not null default '{}',
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  constraint voice_models_version_positive check (version > 0),
  constraint voice_models_profile_has_keys check (
    profile ? 'avg_sentence_length' and
    profile ? 'vocabulary_grade' and
    profile ? 'structural_habits'
  )
);

create unique index voice_models_one_active_per_persona
  on voice_models (persona_id)
  where is_active = true;

alter table voice_models enable row level security;

create policy "own voice models" on voice_models
  for select using (auth.uid() = user_id);
