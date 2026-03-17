# Auto Persona Report on Signup

## Goal
Run persona report generation and radar source seeding immediately when a persona is created (signup/onboarding).

## Current State
- Report generator exists (`packages/pipeline/src/persona-report.ts`).
- `persona_reports` table exists.
- API endpoints exist (`/persona-reports`, `/persona-reports/generate`).
- UI panel exists (Resource Report).
- Trigger.dev sweep job exists (periodic), but **not tied to persona creation**.

## Required Work
- Identify persona creation flow (API route or bot onboarding) and call `generatePersonaReport(personaId)` on create.
- Ensure idempotency (re-running should not duplicate radar sources).
- Optionally add a feature flag to disable auto-seed on create.

## Acceptance
- Creating a persona immediately stores `persona_reports` row.
- Radar sources are seeded once and visible in UI.
- No duplicates on retries.
