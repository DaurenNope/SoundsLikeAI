create table profiles (
  id                uuid        primary key references auth.users(id) on delete cascade,
  username          text        unique,
  telegram_id       bigint      unique,
  onboarding_done   boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function trigger_set_updated_at();

alter table profiles enable row level security;

create policy "own profiles" on profiles
  for all using (auth.uid() = id);
