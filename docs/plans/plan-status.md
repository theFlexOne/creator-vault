# Plan Status

This file is the repo-owned source of truth for plans that are currently active, in progress, paused, blocked, or recently completed.

Use it to answer four questions quickly:

- Which plans are in play right now?
- Where is the canonical plan document?
- What state is each plan in?
- What should the next thread do next?

Status vocabulary:

- `active`: the single plan currently being worked or ready to resume now. Only one plan should ever have this status.
- `in-progress`: work has started, but the plan is not the current active plan.
- `paused`: intentionally stopped, but expected to resume.
- `blocked`: cannot proceed until an external dependency or decision changes.
- `completed`: historical continuity only. Keep it listed only while the context still helps future threads.

Reading rule:

- Start with the `active` row for current work.
- Treat TODO inventories and follow-up notes as supporting references, not as active plans.
- Read `completed` rows only when historical context is needed.

## Running Plan Index

| Plan | Status | Current phase | Next step | Last updated |
| --- | --- | --- | --- | --- |
| [CLI UI Implementation Plan With Review Gates](./CLI%20UI%20Implementation%20Plan%20With%20Review%20Gates.md) | `active` | `1` | Begin Phase 1 by adding `et ui`, scaffolding the interactive layer, and expanding the prompt service around `prompts`. | `2026-07-02` |
| [Add High-Priority Test Coverage (Expanded Sub-Phases)](./Add%20High-Priority%20Test%20Coverage%20%28Expanded%20Sub-Phases%29.md) | `completed` | `6` | Historical reference for the completed coverage rollout, including schema-backed SQLite tests, ingest/source branch coverage, and enforced Jest thresholds. | `2026-07-02` |
| [Real Ingest Implementation Guide Plan With Review Gates](./Real%20Ingest%20Implementation%20Guide%20Plan%20With%20Review%20Gates.md) | `completed` | `9` | Historical reference for the completed ingest rollout. Use only when follow-up work needs implementation background. | `2026-07-01` |

## Update Rules

- Update this file whenever a plan starts, pauses, becomes blocked, completes, or changes its immediate next step.
- Before marking a plan `active`, move any existing `active` plan to the appropriate non-active status.
- When editing a linked plan's phase sequence, status, or next active step, update this row in the same commit/change.
- Keep implementation detail in the linked plan docs, not here.
- Prefer concise next steps that another thread can execute without reading prior conversation history first.
