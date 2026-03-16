create table knowledge_usage (
  id              uuid          primary key default uuid_generate_v4(),
  chunk_id        uuid          not null references knowledge_base(id) on delete cascade,
  persona_id      uuid          not null references personas(id) on delete cascade,
  draft_id        uuid,
  action          feedback_action,
  used_at         timestamptz   not null default now()
);

create index knowledge_usage_persona_chunk_idx
  on knowledge_usage (persona_id, chunk_id, used_at desc);

alter table knowledge_usage enable row level security;

create policy "own knowledge usage" on knowledge_usage
  for all using (auth.uid() = (select user_id from personas where id = persona_id));
