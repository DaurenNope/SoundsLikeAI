# Collection State UI

## Goal
Show per‑platform last collected post and last run timestamp in the UI.

## Current state
- UI panel added: "Collection State"
- API route: `/collection-state`
- Displays `last_post_id`, `last_run_at`, and latest bookmark per platform

## Gaps
- No per‑platform error badges
- No manual "reset stop" control

## To do
- Add error state display from last run
- Add "reset stop" button per platform (admin only)

## Acceptance
- Operator can see exact stop cursor and last collected URL for each platform
