create table cultural_touchpoints (
  id              uuid            primary key default uuid_generate_v4(),
  name            text            not null unique,
  type            touchpoint_type not null,
  description     text,
  embedding       vector(384),
  created_at      timestamptz     not null default now()
);

alter table cultural_touchpoints enable row level security;

create policy "global touchpoints" on cultural_touchpoints
  for select using (true);
