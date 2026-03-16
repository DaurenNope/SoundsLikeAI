create table scrape_cache (
  url         text        primary key,
  content     text        not null,
  scraped_at  timestamptz not null default now(),
  constraint content_not_empty check (char_length(trim(content)) > 0)
);

select cron.schedule('clean-scrape-cache','0 * * * *',
  $$delete from scrape_cache where scraped_at < now() - interval '24 hours'$$
);

alter table scrape_cache enable row level security;

create policy "own scrape cache" on scrape_cache
  for select using (true);
