# Creator Vault

Creator Vault is a TypeScript CLI for collecting YouTube creator data into a local SQLite database. The current app focuses on YouTube channel profiles, channel video metadata, and transcripts.

The CLI binary is named `et`.

## Requirements

- Node.js 20-compatible runtime.
- npm.
- A working `yt-dlp`/YouTube downloader path through `youtube-dl-exec`.
- SQLite support through `better-sqlite3`.

The intended diagnostic command is:

```sh
npm run start -- test-connection
```

At the moment, CLI startup can fail before diagnostics or help text render if the local SQLite schema does not match repository SQL. The checked-in database currently exposes this drift with `table channels has no column named tags`. See `docs/app/database.md`.

## Install And Run

Install dependencies:

```sh
npm install
```

Run the CLI from source:

```sh
npm run start -- <command>
```

Build the package:

```sh
npm run build
```

Link the `et` command locally:

```sh
npm link
```

After linking, run commands as:

```sh
et <command>
```

## Current Workflow

The current ingest workflow is still a three-step pipeline:

1. Ingest channel profile data.
2. Ingest video metadata for channels that already exist in the database.
3. Ingest transcripts for stored videos missing transcripts.

Each ingest command supports a dry-run style mode by default. Add `--save` to persist results to SQLite.

## Commands

### `ingest-channel-profile <inputs..>`

Fetches YouTube channel profile data.

```sh
npm run start -- ingest-channel-profile @example
npm run start -- ingest-channel-profile channels.txt --save
```

Inputs may be YouTube URLs, handles, channel IDs, or a single input file. A `.txt` file is read as one identifier per line. A `.json` file may be an array of strings or an object with a `channels` array containing `link` or `handle` values.

Options:

- `--save`, `-s`: persist fetched channel profile data.

### `ingest-channel-videos <inputs..>`

Fetches video metadata for channel identifiers.

```sh
npm run start -- ingest-channel-videos @example --limit 25
npm run start -- ingest-channel-videos channels.txt --limit 100 --batch 20 --save
```

Options:

- `--limit <number>`: maximum videos to process per channel. Default: `100`.
- `--batch <number>`: video metadata batch size. Default: `20`.
- `--save`, `-s`: persist fetched video metadata.

When saving, the command expects the channel to already exist in the database.

### `ingest-transcripts <inputs..>`

Fetches transcripts for stored videos that do not already have transcript rows.

```sh
npm run start -- ingest-transcripts @example --limit 10
npm run start -- ingest-transcripts channels.txt --limit 50 --save
```

Options:

- `--limit <number>`: maximum transcripts to ingest per channel. Default: `10`.
- `--save`, `-s`: persist fetched transcripts.

When saving or selecting videos, the command expects the channel and video metadata to already exist in the database.

### `test-connection`

Checks the SQLite connection, the YouTube downloader executable, and basic YouTube network access.

```sh
npm run start -- test-connection
```

## Database

The app opens SQLite at `src/db/db.sqlite`. If `src/db/` does not exist, the app creates that directory. Foreign keys are enabled on connection.

Useful database scripts:

```sh
npm run db:seed
npm run db:dump:schema
npm run db:dump:table -- <table-name>
npm run db:dump:data
```

The canonical schema file is `src/db/schema.sql`. See `docs/app/database.md` for the current table model and known schema/repository drift.

## Documentation

- `docs/README.md`: documentation map and taxonomy.
- `docs/app/`: current application documentation.
- `docs/guides/`: practical supporting guides.
- `docs/plans/`: future work, implementation plans, and TODO inventories.
- `docs/agents/`: agent workflow and issue-tracker instructions.

Start with `docs/app/overview.md` for the application architecture.

## Development

Compile TypeScript:

```sh
npm run compile
```

Run tests:

```sh
npm test
```

Run focused test groups:

```sh
npm run test:commands
npm run test:services
npm run test:lib
```

## Current Limits

- The public workflow language is now `ingest`, but the implementation still delegates to legacy workflow services through `src/ingest/legacyWorkflow.adapter.ts`.
- `ingest-channel-videos` currently ingests video metadata only. It does not yet combine channel profile, video metadata, and transcript ingestion into one workflow.
- Transcript storage currently uses one `transcripts` row per video with plain text. Versioned json3 transcript storage is planned but not implemented.
- The checked-in schema and repository SQL have known drift around tag/transcript columns and channel save requirements. Treat `docs/app/database.md` and `docs/plans/*Transcript*` as the starting points before changing persistence behavior.
- Because repository SQL is prepared during command import, this drift can currently block even `--help` and `test-connection` against `src/db/db.sqlite`.
