# Cron Worker (Collection Scan)

## Goal
Run authenticated bookmark collection on a 6‑hour cadence for every active persona.

## Scope
- Trigger.dev hosted job
- Trigger.dev local dev/CLI runner

## Current state
- Job exists: `trigger/jobs/collection-scan.ts`
- Schedule: `0 */6 * * *`
- Calls `runCollectionSweep()` which iterates active personas and runs collectors per platform

## Remaining work
- Add README instructions for Trigger.dev CLI + hosted deployment
- Add runtime configuration docs (env vars)
- Add metrics/logging around per‑platform results
- Add failure alerts (Slack/Telegram later)

## Acceptance
- Worker executes every 6 hours
- Each run updates `collection_state.last_run_at` for each platform/persona
- No cross‑persona leakage
