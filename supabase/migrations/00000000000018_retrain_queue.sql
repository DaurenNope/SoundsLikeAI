create table retrain_queue (
  persona_id    uuid        primary key references personas(id) on delete cascade,
  requested_at  timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

create or replace function check_retrain_threshold()
returns trigger as $$
declare event_count integer;
begin
  select count(*) into event_count
  from feedback_events
  where persona_id = new.persona_id
    and created_at > (
      select coalesce(max(created_at), '1970-01-01')
      from voice_models where persona_id = new.persona_id
    );
  if event_count >= 50 then
    insert into retrain_queue (persona_id)
    values (new.persona_id)
    on conflict (persona_id) do update set requested_at = now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trigger_retrain_check
  after insert on feedback_events
  for each row execute function check_retrain_threshold();

alter table retrain_queue enable row level security;

create policy "own retrain queue" on retrain_queue
  for all using (auth.uid() = (select user_id from personas where id = persona_id));
