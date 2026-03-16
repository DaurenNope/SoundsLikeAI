# SoundsLikeAI — Project Management & Test Gates

## Operating Rules
- Every milestone ends with a manual smoke test and a documented pass/fail.
- No schema changes without updating this doc and the Supabase SQL.
- If a step fails, fix before moving forward.

## Milestones + Test Gates

### M1 — Repo + Schema Guard + Import Tooling
**Goal:** Clean monorepo scaffold + schema guard + import script.
**Gate:**
- `npm run schema:guard` passes (against Supabase DB)
- Import script dry run completes

### M2 — Phase‑1 Scrapers (Article/RSS/Reddit)
**Goal:** Clean scrape + cache + rate‑limit
**Gate:**
- `scrape(url)` returns content for one article + reddit post
- Same URL cached on second run

### M3 — Fragment → Draft pipeline
**Goal:** Fragment ingestion produces drafts
**Gate:**
- Insert fragment → draft created
- Draft delivered to Telegram

### M4 — Radar scan
**Goal:** Active sources generate signal items + fragments
**Gate:**
- Radar scan pulls RSS + Reddit
- New fragments created and drafts delivered

### M5 — Approval flow
**Goal:** Approve/trash in Telegram updates DB
**Gate:**
- Approve changes status to `approved`
- Trash changes status to `trashed`
