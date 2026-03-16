create table drafts (
  id              uuid          primary key default uuid_generate_v4(),
  persona_id      uuid          not null references personas(id) on delete cascade,
  user_id         uuid          not null references profiles(id) on delete cascade,
  fragment_id     uuid          not null references fragments(id) on delete cascade,
  platform        platform_type not null,
  text            text          not null,
  char_count      integer       not null generated always as (char_length(text)) stored,
  voice_match     integer,
  model_version   integer,
  source_type     text          not null default 'reactive',
  status          draft_status  not null default 'ready',
  scheduled_for   timestamptz,
  generated_at    timestamptz   not null default now(),
  actioned_at     timestamptz,
  constraint text_not_empty check (char_length(trim(text)) >= 10),
  constraint voice_match_range check (voice_match is null or voice_match between 0 and 100),
  constraint actioned_consistency check (status = 'ready' or actioned_at is not null),
  constraint twitter_char_limit check (platform != 'twitter' or char_length(text) <= 280)
);

create index drafts_persona_status_idx
  on drafts (persona_id, status, generated_at desc);

create or replace function guard_draft_status_transition()
returns trigger as $$
begin
  if old.status = 'published' and new.status != 'published' then
    raise exception 'Cannot change status of a published draft';
  end if;
  if old.status = 'trashed' and new.status != 'trashed' then
    raise exception 'Cannot un-trash a draft. Create a new one.';
  end if;
  if old.status = 'ready' and new.status != 'ready' and new.actioned_at is null then
    new.actioned_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_draft_status_transition
  before update on drafts
  for each row execute function guard_draft_status_transition();

alter table drafts enable row level security;

create policy "own drafts" on drafts
  for select using (auth.uid() = user_id);

create policy "own drafts update" on drafts
  for update using (auth.uid() = user_id);
