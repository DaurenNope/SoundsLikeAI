# SoundsLikeAI — Scrapers & Tools Specification

> This document covers every scraping, automation, and publishing tool in the system.
> Read alongside `BACKEND_BUILD.md`. These are the teeth of the pipeline.
> All scrapers live in `packages/scrapers/`. All publishers live in `packages/publisher/`.

---

## Philosophy

- **Never get blocked.** Stealth first, speed second.
- **Never hit the same URL twice in 24h.** Cache everything.
- **Fail gracefully.** One broken source never kills the pipeline.
- **Crawlee orchestrates everything.** Don't write your own queue/retry logic.
- **Playwright is the nuclear option.** Use it only when lighter tools fail.

---

## Package Structure

```
packages/scrapers/
├── src/
│   ├── index.ts
│   ├── orchestrator.ts
│   ├── cache.ts
│   ├── proxy.ts
│   ├── fingerprint.ts
│   ├── sources/
│   │   ├── article.ts
│   │   ├── rss.ts
│   │   ├── reddit.ts
│   │   ├── twitter.ts
│   │   ├── newsletter.ts
│   │   ├── podcast.ts
│   │   ├── youtube.ts
│   │   └── paywall.ts
│   └── utils/
│       ├── clean.ts
│       ├── detect.ts
│       └── rate-limit.ts
└── package.json

packages/publisher/
├── src/
│   ├── index.ts
│   ├── session.ts
│   ├── platforms/
│   │   ├── twitter.ts
│   │   ├── threads.ts
│   │   └── linkedin.ts
│   └── screenshot.ts
└── package.json
```

---

## Core: Scrape Cache

Every URL scraped gets cached in Supabase for 24 hours.

```sql
create table scrape_cache (
  url         text primary key,
  content     text not null,
  scraped_at  timestamptz default now()
);

select cron.schedule(
  'clean-scrape-cache',
  '0 * * * *',
  $$delete from scrape_cache where scraped_at < now() - interval '24 hours'$$
);
```

---

## Phased Delivery (Aligned to Plan)

**Phase 1 (MVP)**
- Article + RSS + Reddit
- Unified `scrape(url)` + cache + rate limit
- Crawlee orchestrator (basic stealth, no proxies)

**Phase 2**
- YouTube transcripts
- Podcast RSS + transcription
- Newsletter inbound parsing

**Phase 3**
- Twitter (multi-strategy)
- Paywall bypass
- Full stealth + proxy rotation + fingerprint hardening

