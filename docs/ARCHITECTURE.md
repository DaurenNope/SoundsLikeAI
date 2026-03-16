# Architecture

## Layers
1. API: HTTP endpoints, request validation, response shaping.
2. Domain: Core business logic, pure functions, no IO.
3. Services: IO boundaries (DB, LLMs, third-party).
4. Workers: Background orchestration and scheduling.

## Rules
- API must never talk directly to third-party services.
- Domain must be deterministic and testable.
- Services must expose narrow interfaces.
- Workers only call services and domain.

## Data Flow (Target)
Collector -> Ingestion -> Rank -> Ideas -> Drafts -> Approval -> Queue -> Publish -> Feedback

