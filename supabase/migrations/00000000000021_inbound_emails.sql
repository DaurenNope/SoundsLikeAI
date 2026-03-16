create table inbound_emails (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        references profiles(id) on delete cascade,
  persona_id  uuid        references personas(id) on delete set null,
  subject     text,
  from_email  text        not null,
  content     text        not null,
  processed   boolean     not null default false,
  received_at timestamptz not null default now(),
  constraint content_min check (char_length(trim(content)) >= 50)
);

alter table inbound_emails enable row level security;

create policy "own inbound" on inbound_emails
  for select using (auth.uid() = user_id);
