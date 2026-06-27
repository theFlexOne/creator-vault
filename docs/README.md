# Documentation Map

This directory separates current application documentation from planning notes and agent process files.

## Current Application Docs

Use `docs/app/` for durable docs that describe the app as it works now.

- `app/overview.md`: app purpose, main layers, and code reading path.
- `app/cli.md`: command reference and examples.
- `app/ingest-workflows.md`: current ingest flow behavior and boundaries.
- `app/database.md`: SQLite location, schema, scripts, and persistence notes.

## Guides

Use `docs/guides/` for supporting how-to material that helps maintain the app but is not the canonical current-state description.

- `guides/better-sqlite.md`: project-specific `better-sqlite3` practices extracted from the older root guide.

## Plans

Use `docs/plans/` for future work, TODO inventories, PRD-style notes, implementation plans, and review-gated work.

Important current plan artifacts:

- `plans/Ingest Implementation TODO Inventory.md`
- `plans/Future Transcript Schema TODO.md`
- `plans/Real Ingest Implementation Guide Plan With Review Gates.md`

These files are intentionally not app docs. Link to them when documenting known limits or future work, but keep current app behavior in `docs/app/`.

## Agent And Tooling Docs

- `docs/agents/`: issue tracker, triage labels, and domain-doc instructions for agents.
- `docs/postman/`: Postman collections and external-tool inspection artifacts.
