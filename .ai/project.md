# Project Context

## What This Repo Is

Creator Vault is an existing TypeScript CLI for collecting YouTube creator, channel, video, and transcript data into a local SQLite database.

## Current Runtime Shape

- CLI entrypoint: `bin/run.ts`
- Command registry: `src/commands/`
- Guided terminal flow: `src/ui/`
- Ingest orchestration: `src/ingest/`
- Persistence repositories: `src/repositories/`
- Support services: `src/services/`
- SQLite and lower-level helpers: `src/lib/`

## Domain Language

- Prefer the creator-centric vocabulary in `CONTEXT.md`.
- Use Creator as the cross-platform identity.
- Use YouTube Channel, Video, and Transcript as the concrete YouTube terms.

## Read First

- `README.md`
- `CONTEXT.md`
- `docs/app/overview.md`
- `docs/app/ingest-workflows.md`
- `docs/app/database.md`

## Scope Notes

- This scaffold is for a solo maintainer first.
- v1 targets shared guidance that should work for GitHub Copilot in VS Code and Codex without adding redundant tool-specific wrapper files.
- AI in this repo is a complex assistant, not a vibe-coding implementation engine.
- Application source changes stay with the lead developer.
- Safe default output areas are tests, docs, agent-context files, and other non-behavioral guidance.
- If a future tool needs a wrapper, keep it thin and make `AGENTS.md` remain the source of truth.
