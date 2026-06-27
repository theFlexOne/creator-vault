# Application Overview

Creator Vault is a TypeScript CLI for collecting YouTube creator data into a local SQLite database. The current domain is creator-centric: a Creator owns platform-specific publishing surfaces, and the active platform surface is a YouTube Channel.

## Main Concepts

- Creator: the cross-platform identity tracked by the project.
- YouTube Channel: the YouTube publishing surface owned by one creator.
- Video: the primary YouTube content unit tracked under a channel.
- Transcript: the text record attached to a specific video.

Use `CONTEXT.md` as the domain glossary when naming issues, docs, tests, and code.

## Runtime Shape

- CLI entrypoint: `bin/run.ts`.
- Command registry: `src/commands/index.ts`.
- Public ingest module: `src/ingest/index.ts`.
- Current workflow adapter: `src/ingest/legacyWorkflow.adapter.ts`.
- Legacy workflow services: `src/services/ingestChannelProfile.service.ts`, `src/services/ingestChannelVideos.service.ts`, and `src/services/ingestTranscripts.service.ts`.
- YouTube helpers: `src/lib/youtube/`.
- SQLite connection: `src/lib/sqlite/db.ts`.
- Persistence repositories: `src/repositories/`.

`bin/run.ts` loads environment variables with `dotenv`, registers all yargs commands, and requires at least one command. Commands call the ingest module or service layer. The ingest module currently preserves behavior by delegating to the legacy workflow adapter.

## Data Flow

1. The user runs `et <command>` or `npm run start -- <command>`.
2. yargs parses command arguments and options.
3. Command handlers call `src/ingest` functions or diagnostic services.
4. Ingest workflows resolve identifiers from direct args or one input file.
5. YouTube helpers fetch channel, video, or transcript data.
6. Repositories write to SQLite only when `--save` is enabled.

## What To Read First

1. `README.md` for setup, commands, and current limits.
2. `docs/app/cli.md` for command behavior.
3. `docs/app/ingest-workflows.md` for the current ingest architecture.
4. `docs/app/database.md` before changing persistence code.
5. `docs/plans/Ingest Implementation TODO Inventory.md` before starting future ingest implementation work.
