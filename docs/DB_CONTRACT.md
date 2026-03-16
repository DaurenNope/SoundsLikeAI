# Database Contract

## Source of Truth
- The only authoritative schema is the Supabase SQL migrations in `/Users/mac/Documents/Development/SoundsLikeAI/supabase/migrations`.
- **No Alembic / Python schema** is used in this project.
- All schema changes must be made via new SQL migration files.
- Schema is enforced at runtime by `packages/db/src/schemaGuard.ts` and in CI via `npm run schema:guard`.

## Canonical Tables (Current)
- profiles
- voice_models
- personas
- voice_samples
- feedback_events
- radar_sources
- signal_items
- fragments
- drafts
- published_posts
- scrape_cache
- inbound_emails

## Canonical Functions (Current)
- score_signal_for_user
- get_user_inbox
- get_voice_stats

## Contract Rules
- No runtime DDL in application code.
- Migrations must preserve data and be forward‑only.
- Any schema drift is a hard failure.
