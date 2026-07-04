# Documentation Map

This directory separates current application documentation from planning notes and agent process files.

## Current Application Docs

Use `docs/app/` for durable docs that describe the app as it works now.

- `app/overview.md`: app purpose, main layers, and code reading path.
- `app/cli.md`: command reference and examples.
- `app/ingest-workflows.md`: current ingest flow behavior and boundaries.
- `app/database.md`: SQLite location, schema, scripts, and persistence notes.

## Architecture Decisions

Use `docs/adr/` for durable architectural and structural decisions that are hard to reverse, non-obvious without context, and the result of a real tradeoff.

- `adr/`: selective ADR log for repo structure, persistence architecture, ingest boundaries, and other long-lived design decisions.

These files are intentionally narrower than `docs/app/`. They explain why a durable decision exists, not how the current app works end to end.

## Guides

Use `docs/guides/` for supporting how-to material that helps maintain the app but is not the canonical current-state description.

- `guides/better-sqlite.md`: project-specific `better-sqlite3` practices adapted from the older root guide.

## Plans

Use `docs/plans/` for future work, TODO inventories, PRD-style notes, implementation plans, and review-gated work.

Any future plan that changes behavior, terminology, schema, or command surface should include a documentation update step and should reference `docs/agents/docs-update-checklist.md`.

Use `plans/plan-status.md` first when you need the current cross-thread view of active and in-progress work.

Plan status conventions:

- `active` plan rows in `plans/plan-status.md` are the current work surface.
- Follow-up notes and TODO inventories support ongoing work, but they are not active plans.
- `completed` plan rows are historical continuity only and should not be treated as the primary current reading path.

Current planning surfaces:

- `plans/plan-status.md`
- `plans/Ingest Implementation TODO Inventory.md`

Historical planning references:

- `plans/Current Transcript Schema And Follow-Up.md`
- `plans/Real Ingest Implementation Guide Plan With Review Gates.md`

These files are intentionally not app docs. Link to them when documenting known limits or future work, but keep current app behavior in `docs/app/`.

## Agent And Tooling Docs

- `docs/agents/`: issue tracker, triage labels, and domain-doc instructions for agents.
- `docs/agents/docs-update-checklist.md`: required docs-update checklist for code and terminology changes.
- `docs/postman/`: Postman collections and external-tool inspection artifacts.

Agent-facing docs define the boundary for agent work: documentation and application tests may change, but application code may not.
