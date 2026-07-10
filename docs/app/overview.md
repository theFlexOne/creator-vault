# Application Overview

Creator Vault is a TypeScript CLI for collecting YouTube channel, video, and transcript data into a local SQLite database. The domain is profile-centric: a Profile owns platform-specific publishing surfaces, and the active platform surface is a YouTube Channel.

## Main Concepts

- Profile: the cross-platform identity tracked by the project.
- YouTube Channel: the YouTube publishing surface owned by one profile.
- Video: the primary YouTube content unit tracked under a channel.
- Transcript: the text record attached to a specific video.

Use `CONTEXT.md` as the domain glossary when naming issues, docs, tests, and code.

## Runtime Shape

- CLI entrypoint: `bin/run.ts`.
- Command registry: `src/commands/index.ts`.
- Interactive shell: `src/ui/`.
- Public ingest module: `src/ingest/index.ts`.
- Ingest implementation: `src/ingest/`.
- Ingest source adapter: `src/ingest/youtubeSource.ts`.
- Diagnostic services: `src/services/` contains non-ingest support services such as `testConnection`.
- YouTube helpers: lower-level helpers under `src/lib/youtube/`.
- SQLite connection: `src/lib/sqlite/db.ts`.
- Persistence repositories: `src/repositories/`.

`bin/run.ts` loads environment variables with `dotenv`, registers all yargs commands, and requires at least one command. Ingest commands call the public ingest module; diagnostics call support services; `et ui` enters the prompt-driven shell under `src/ui/`, which prompts for arguments and wraps those same public seams with streaming status plus final summaries.

## Data Flow

1. The user runs `et <command>` or `npm run start -- <command>`.
2. yargs parses command arguments and options.
3. Direct command handlers call `src/ingest` functions or diagnostic services, while `et ui` enters the prompt-driven shell.
4. Ingest workflows resolve identifiers from direct args or one input file.
5. The ingest source adapter retrieves channel metadata, paged video metadata, and json3 captions.
6. The ingest module parses json3 captions and calls ingest storage.
7. Ingest storage calls repositories; write methods run only when `--save` is enabled.

Current UI note: the interactive shell is a guided terminal flow, not a pane-based dashboard. It reuses the direct ingest and diagnostic seams rather than duplicating workflow logic inside the UI layer.

## What To Read First

1. `README.md` for setup, commands, and current limits.
2. `docs/app/cli.md` for command behavior.
3. `docs/app/ingest-workflows.md` for the current ingest architecture.
4. `docs/app/database.md` before changing persistence code.
5. `docs/README.md` for the documentation map and where current-state material lives.
6. Your issue tracker or external planning system for follow-up work that is not captured as current-state documentation.
