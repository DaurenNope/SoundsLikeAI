create table persona_touchpoints (
  id              uuid        primary key default uuid_generate_v4(),
  persona_id      uuid        not null references personas(id) on delete cascade,
  touchpoint_id   uuid        not null references cultural_touchpoints(id) on delete cascade,
  weight          float       not null default 1.0,
  added_at        timestamptz not null default now(),
  unique(persona_id, touchpoint_id),
  constraint weight_range check (weight >= 0.1 and weight <= 5.0)
);

create index persona_touchpoints_persona_idx
  on persona_touchpoints (persona_id, added_at desc);

alter table persona_touchpoints enable row level security;

create policy "own touchpoints" on persona_touchpoints
  for all using (auth.uid() = (select user_id from personas where id = persona_id));
