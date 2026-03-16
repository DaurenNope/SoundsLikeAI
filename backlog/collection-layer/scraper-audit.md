# Scraper Audit

## Goal
Audit current scrapers and identify any refactors required for stability + performance.

## Areas
- `packages/scrapers/src/sources/*`
- `packages/scrapers/src/orchestrator.ts`
- `scripts/collect_bookmarks.py` (Beyondlines bridge)

## Checks
- Rate limits + retry behavior
- Timeout defaults
- Proxy support coverage
- Content extraction quality
- Failure modes and logging

## Acceptance
- For each source, define: inputs, outputs, stop cursor behavior, error handling
- Identify changes needed to reach >95% success rate in real‑world runs
