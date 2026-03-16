# SoundsLikeAI — Backend Build Instructions

> This document is the complete specification for building the SoundsLikeAI backend.
> Read every section before writing any code.
> Follow the milestones in order. Do not skip ahead.

---

## What This System Does

SoundsLikeAI is an autonomous voice operating system. It:
- Ingests raw user inputs (voice memos, links, text, screenshots) via Telegram bot or web app
- Learns the user's writing voice from their past content
- Generates social media drafts that sound authentically like the user
- Scans the web for content worth reacting to
- Publishes approved drafts automatically

The backend has three independent concerns that share one database:
1. **The Bot** — listens, ingests, responds (Telegram)
2. **The Pipeline** — processes inputs, generates drafts (background jobs)
3. **The Scheduler** — scans sources, publishes posts (cron jobs)

---

## Stack

| Layer | Technology | Reason |
|---|---|---|
| Language | TypeScript (Node.js) | Consistent across entire stack |
| Monorepo | Turborepo | Shared packages, single codebase |
| Bot | grammy.dev | Best TypeScript Telegram library |
| API server | Hono on Bun | Fast, lightweight, handles webhooks |
| Background jobs | Trigger.dev v3 | Cron + event-driven, no timeout limits |
| Database | Supabase (Postgres + pgvector) | Vectors + realtime + storage |
| Embeddings | sentence-transformers (BGE-small) | Self-hosted on VPS, zero cost |
| Transcription | Whisper.cpp | Self-hosted on VPS, zero cost |
| Scraping | Crawlee + Playwright stealth | Best open source scraping framework |
| LLM | Groq → Gemini → Mistral → OpenRouter | Free tier rotation with failover |
| Publishing | Playwright automation | Works now, API later |
| Hosting (bot+jobs) | Hetzner VPS (CX22, €4.35/mo) | Always-on processes |
| Hosting (web) | Vercel | Frontend + light API routes |

---

## Monorepo Structure

```
soundslikeai/
├── apps/
│   ├── web/                    # Next.js frontend (separate repo/document)
│   └── bot/                    # Telegram bot + Hono API server
│       ├── src/
│       │   ├── index.ts        # Entry point
│       │   ├── bot/            # grammy handlers
│       │   │   ├── index.ts
│       │   │   ├── handlers/
│       │   │   │   ├── voice.ts
│       │   │   │   ├── text.ts
│       │   │   │   ├── link.ts
│       │   │   │   ├── photo.ts
│       │   │   │   └── document.ts
│       │   │   └── keyboards.ts
│       │   └── api/            # Hono API
│       │       ├── index.ts
│       │       └── routes/
│       │           ├── webhook.ts
│       │           └── ingest.ts
│       └── package.json
├── packages/
│   ├── db/                     # Supabase client + all types
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts        # Generated from Supabase schema
│   │   │   └── queries/        # Reusable query functions
│   │   └── package.json
│   ├── ai/                     # All AI interactions
│   │   ├── src/
│   │   │   ├── llm/
│   │   │   │   ├── router.ts   # LLM failover logic
│   │   │   │   ├── groq.ts
│   │   │   │   ├── gemini.ts
│   │   │   │   ├── mistral.ts
│   │   │   │   └── openrouter.ts
│   │   │   ├── embeddings.ts   # BGE embeddings client
│   │   │   ├── whisper.ts      # Whisper.cpp client
│   │   │   └── prompts/        # All prompt templates
│   │   │       ├── draft.ts
│   │   │       ├── voice-analysis.ts
│   │   │       └── signal-scoring.ts
│   │   └── package.json
│   ├── pipeline/               # Core processing logic
│   │   ├── src/
│   │   │   ├── fragment.ts     # Fragment processing
│   │   │   ├── draft.ts        # Draft generation
│   │   │   ├── voice-model.ts  # Voice model building/updating
│   │   │   └── matching.ts     # Signal scoring + matching
│   │   └── package.json
│   └── scrapers/               # All scraping logic
│       ├── src/
│       │   ├── crawlee/        # Crawlee crawlers
│       │   ├── rss.ts
│       │   ├── reddit.ts
│       │   ├── twitter.ts
│       │   └── article.ts      # Clean article extraction
│       └── package.json
├── trigger/                    # All Trigger.dev jobs
│   ├── jobs/
│   │   ├── process-fragment.ts
│   │   ├── radar-scan.ts
│   │   ├── retrain-voice.ts
│   │   └── publish-post.ts
│   └── package.json
├── turbo.json
└── package.json
```

---

## Database Schema

Run this in Supabase SQL editor before writing any application code.

### Step 1 — Enable Extensions

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pg_cron";
```

### Step 2 — Identity Layer

```sql
create table profiles (
  id              uuid references auth.users primary key,
  username        text unique,
  telegram_id     bigint unique,
  onboarding_done boolean default false,
  created_at      timestamptz default now()
);

create table voice_models (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  version         integer not null default 1,
  profile         jsonb not null default '{}',
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- Only one active model per user
create unique index on voice_models (user_id) where is_active = true;

create table personas (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  platform        text not null,
  style_notes     text,
  taboos          text[] default '{}',
  active          boolean default true,
  created_at      timestamptz default now()
);
```

### Step 3 — Evergreen Identity Layer

```sql
create table cultural_touchpoints (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  type            text not null, -- person / book / film / podcast / concept
  description     text,
  embedding       vector(384),
  created_at      timestamptz default now()
);

create table user_touchpoints (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  touchpoint_id   uuid references cultural_touchpoints not null,
  weight          float default 1.0,
  added_at        timestamptz default now(),
  unique(user_id, touchpoint_id)
);

create table user_opinions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  topic           text not null,
  stance          text not null,
  intensity       integer check (intensity between 1 and 10),
  raw_quote       text,
  embedding       vector(384),
  created_at      timestamptz default now()
);
```

### Step 4 — Voice Training Layer

```sql
create table voice_samples (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  content         text not null,
  platform        text,
  source          text default 'manual', -- manual / approved_draft / imported
  embedding       vector(384),
  created_at      timestamptz default now()
);

create table feedback_events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  draft_id        uuid not null, -- references drafts, added after drafts table
  action          text not null, -- approved / trashed / edited
  original_text   text,
  edited_text     text,
  diff_analysis   jsonb,
  created_at      timestamptz default now()
);
```

### Step 5 — Radar Layer

```sql
create table radar_sources (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  name            text not null,
  url             text,
  type            text not null, -- rss / twitter / reddit / newsletter
  active          boolean default true,
  last_fetched    timestamptz,
  fetch_interval  interval default '3 hours',
  config          jsonb default '{}'
);

create table signal_items (
  id              uuid primary key default uuid_generate_v4(),
  source_id       uuid references radar_sources not null,
  user_id         uuid references profiles not null,
  title           text,
  content         text,
  url             text,
  embedding       vector(384),
  relevance_score integer check (relevance_score between 0 and 100),
  score_reasoning jsonb,
  status          text default 'raw', -- raw / scored / queued / drafted / ignored
  fetched_at      timestamptz default now()
);
```

### Step 6 — Content Pipeline

```sql
create table fragments (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  type            text not null, -- text / voice / link / image / document
  raw_content     text,
  source_url      text,
  file_path       text,
  embedding       vector(384),
  status          text default 'raw', -- raw / processing / drafted / failed
  signal_item_id  uuid references signal_items,
  metadata        jsonb default '{}',
  created_at      timestamptz default now()
);

create table drafts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles not null,
  fragment_id     uuid references fragments not null,
  platform        text not null,
  text            text not null,
  char_count      integer,
  voice_match     integer check (voice_match between 0 and 100),
  model_version   integer,
  status          text default 'ready', -- ready / approved / trashed / published
  scheduled_for   timestamptz,
  generated_at    timestamptz default now(),
  actioned_at     timestamptz
);

-- Add FK now that drafts exists
alter table feedback_events
  add constraint feedback_events_draft_id_fkey
  foreign key (draft_id) references drafts(id);

create table published_posts (
  id              uuid primary key default uuid_generate_v4(),
  draft_id        uuid references drafts not null,
  user_id         uuid references profiles not null,
  platform        text not null,
  external_id     text,
  published_at    timestamptz,
  screenshot_path text,
  engagement      jsonb default '{}'
);
```

### Step 7 — Indexes

```sql
-- Vector similarity (critical for matching performance)
create index on voice_samples
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on signal_items
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on cultural_touchpoints
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on fragments
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on user_opinions
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Status queries
create index on drafts (user_id, status);
create index on fragments (user_id, status);
create index on signal_items (user_id, status, relevance_score desc);

-- Bot lookup
create index on profiles (telegram_id);
```

### Step 8 — Supabase Storage Buckets

Create these buckets in Supabase Storage dashboard:
- `voice-memos` (private)
- `screenshots` (private)
- `documents` (private)

---

## Environment Variables

```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=

# LLM Providers (free tiers)
GROQ_API_KEY=
GEMINI_API_KEY=
MISTRAL_API_KEY=
OPENROUTER_API_KEY=

# Self-hosted services (on VPS)
EMBEDDINGS_SERVICE_URL=http://localhost:8001
WHISPER_SERVICE_URL=http://localhost:8002

# Trigger.dev
TRIGGER_SECRET_KEY=

# Reddit
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REFRESH_TOKEN=

# Twitter (optional initially)
TWITTER_BEARER_TOKEN=
```

