# SoundsLikeAI

Clean rebuild with strict architecture and a stable database contract.

## Principles
- One canonical data model.
- Database changes only via migrations.
- Schema contract enforced at startup and in CI.
- No runtime DDL.
- Clear boundaries: API, domain, services, workers.

## Schema Source of Truth
- Supabase SQL migrations in `supabase/migrations/` are the only authoritative schema.
- No Python/Alembic backend is used in this project.

## Quick Start (MVP)
1. Copy `.env.example` to `.env` and fill in Supabase plus one LLM key. Set `TELEGRAM_BOT_DISABLED=true` to run API-only. Optional: set `WHISPER_SERVICE_URL` for voice ingestion.
2. Install deps: `npm install`.
3. Validate schema: `npm run schema:guard`.
4. Seed a profile: `npm run seed:profile` (set `SEED_*` values first; you can also set `SEED_AUTH_EMAIL` to auto-create an auth user).
5. Run the API: `npm run dev -- --filter @sla/bot`.
6. Open the web console at `http://localhost:3001/ui`.
7. Ingest content via the API (set `API_KEY` or `INGEST_API_KEY` for auth):
```bash
curl -X POST http://localhost:3001/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "user_id": "<profile-uuid>",
    "type": "text",
    "raw_content": "Draft me a post about today's launch."
  }'
```
8. Fetch drafts:
```bash
curl "http://localhost:3001/drafts?user_id=<profile-uuid>" \
  -H "x-api-key: $API_KEY"
```

Telegram is optional. To enable it later, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_DISABLED=false`.

## Structure (monorepo)
- `apps/bot/`: Telegram bot + Hono API
- `packages/*`: shared packages (db, ai, pipeline, scrapers, publisher)
- `trigger/`: Trigger.dev jobs
- `docs/`: specs and project management

## Docs
- `docs/BACKEND_BUILD.md`
- `docs/SCRAPERS_TOOLS.md`
- `docs/PROJECT_MANAGEMENT.md`
