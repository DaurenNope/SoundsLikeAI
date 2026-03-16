create schema if not exists public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pg_cron";
create extension if not exists "pg_trgm";
