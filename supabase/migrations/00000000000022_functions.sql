alter table knowledge_usage
  add constraint knowledge_usage_draft_fk
  foreign key (draft_id) references drafts(id) on delete set null;

create or replace function score_signal_for_persona(
  p_persona_id uuid,
  p_embedding  vector(384)
)
returns table (avg_similarity float, sample_count integer)
language sql stable as $$
  select
    avg(1 - (vs.embedding <=> p_embedding))::float,
    count(*)::integer
  from (
    select embedding from voice_samples
    where persona_id = p_persona_id and embedding is not null
    order by embedding <=> p_embedding
    limit 20
  ) vs;
$$;

create or replace function find_relevant_knowledge(
  p_persona_id uuid,
  p_query_embedding vector(384),
  p_limit integer default 10,
  p_days_cooldown integer default 14
)
returns table (
  chunk_id uuid,
  source_name text,
  source_type knowledge_source_type,
  content text,
  similarity float
)
language sql stable as $$
  select
    kb.id,
    kb.source_name,
    kb.source_type,
    kb.content,
    (1 - (kb.embedding <=> p_query_embedding))::float as similarity
  from knowledge_base kb
  where kb.embedding is not null
    and (kb.is_global = true or kb.user_id = (
      select user_id from personas where id = p_persona_id
    ))
    and kb.id not in (
      select chunk_id from knowledge_usage
      where persona_id = p_persona_id
        and used_at > now() - (p_days_cooldown || ' days')::interval
    )
  order by kb.embedding <=> p_query_embedding
  limit p_limit;
$$;

create or replace function get_persona_inbox(p_persona_id uuid)
returns table (
  draft_id uuid,
  platform platform_type,
  text text,
  char_count integer,
  voice_match integer,
  source_type text,
  fragment_type fragment_type,
  source_url text,
  generated_at timestamptz
)
language sql stable security definer as $$
  select d.id, d.platform, d.text, d.char_count, d.voice_match,
         d.source_type, f.type, f.source_url, d.generated_at
  from drafts d
  join fragments f on f.id = d.fragment_id
  where d.persona_id = p_persona_id and d.status = 'ready'
  order by d.generated_at desc
  limit 50;
$$;
