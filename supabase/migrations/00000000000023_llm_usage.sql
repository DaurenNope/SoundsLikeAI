create table llm_usage (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        references profiles(id) on delete set null,
  persona_id    uuid        references personas(id) on delete set null,
  provider      text        not null,
  model         text        not null,
  key_alias     text,
  caller        text,
  status        text        not null,
  latency_ms    integer,
  prompt_chars  integer,
  response_chars integer,
  error         text,
  created_at    timestamptz not null default now(),
  constraint llm_usage_status check (status in ('success','error'))
);

create index llm_usage_created_at_idx on llm_usage (created_at desc);
create index llm_usage_provider_idx on llm_usage (provider);

alter table llm_usage enable row level security;
create policy "own llm usage" on llm_usage for select using (auth.uid() = user_id);
