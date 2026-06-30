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
- `completed`: finished recently enough that keeping it listed still helps continuity.

## Running Plan Index

| Plan | Status | Current phase | Next step | Last updated |
| --- | --- | --- | --- | --- |
| [Real Ingest Implementation Guide Plan With Review Gates](./Real%20Ingest%20Implementation%20Guide%20Plan%20With%20Review%20Gates.md) | `active` | `8` | Review Phase 7 ingest orchestration, then start Phase 8 CLI and report finalization. | `2026-06-30` |
| [Add High-Priority Test Coverage (Expanded Sub-Phases)](./Add%20High-Priority%20Test%20Coverage%20%28Expanded%20Sub-Phases%29.md) | `in-progress` | `1` | Start Phase 1 by adding `normalizeYoutubeUrl` branch coverage after the active plan changes status. | `2026-06-28` |

## Update Rules

- Update this file whenever a plan starts, pauses, becomes blocked, completes, or changes its immediate next step.
- Before marking a plan `active`, move any existing `active` plan to the appropriate non-active status.
- When editing a linked plan's phase sequence, status, or next active step, update this row in the same commit/change.
- Keep implementation detail in the linked plan docs, not here.
- Prefer concise next steps that another thread can execute without reading prior conversation history first.
