# Bookmark Collection Hardening

## Goal
Make authenticated bookmark collection reliable for Twitter/Threads/Reddit with real stop cursors and zero duplicates.

## Current state
- Collectors called via `scripts/collect_bookmarks.py`
- Stop cursor stored in `collection_state.last_post_id`
- Bookmarks stored in `bookmarks` table, fragments linked via `bookmark_id`
- UI shows collection state (last post + last run)

## Gaps
- Reddit author backfill depends on API keys being present
- Twitter has 3 synthetic URLs with no extractable post_id
- Need stronger runtime logging for per‑platform failures

## To do
- Add structured logging for each platform run
- Add retry/backoff per platform
- Ensure per‑platform limits are configurable in one place
- Normalize author/post_id for all platforms at insert time
- Optional: store `last_success_post_id` vs `last_seen_post_id`

## Acceptance
- Collection succeeds with fresh cookies
- Stops are updated correctly and prevent re‑collection
- Duplicate URLs never re‑insert for same persona/platform
