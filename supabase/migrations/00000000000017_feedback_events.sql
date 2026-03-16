create table feedback_events (
  id              uuid            primary key default uuid_generate_v4(),
  persona_id      uuid            not null references personas(id) on delete cascade,
  user_id         uuid            not null references profiles(id) on delete cascade,
  draft_id        uuid            not null references drafts(id) on delete cascade,
  action          feedback_action not null,
  original_text   text            not null,
  edited_text     text,
  diff_analysis   jsonb,
  created_at      timestamptz     not null default now(),
  constraint edited_text_required check (
    action != 'edited' or
    (edited_text is not null and char_length(trim(edited_text)) > 0)
  ),
  constraint edit_must_change check (
    action != 'edited' or edited_text is distinct from original_text
  )
);

create or replace function record_draft_feedback()
returns trigger as $$
begin
  if old.status = 'ready' and new.status in ('approved','trashed') then
    insert into feedback_events (persona_id, user_id, draft_id, action, original_text)
    values (new.persona_id, new.user_id, new.id, new.status::feedback_action, new.text);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger auto_record_feedback
  after update on drafts
  for each row execute function record_draft_feedback();

alter table feedback_events enable row level security;

create policy "own feedback" on feedback_events
  for select using (auth.uid() = user_id);
