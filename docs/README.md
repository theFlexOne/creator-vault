# Documentation Map

This directory separates current application documentation from supporting guides and tooling artifacts.

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
- `guides/profile-taxonomy-migration.md`: full no-gates migration plan for the profile-centric taxonomy model.

Any future plan that changes behavior, terminology, schema, or command surface should include a documentation update step that updates the relevant current-state docs in `docs/app/`, `README.md`, or other affected documentation.

## Tooling Docs

- `docs/postman/`: Postman collections and external-tool inspection artifacts.
