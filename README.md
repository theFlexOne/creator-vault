# Creator Vault

Creator Vault is a TypeScript CLI for collecting YouTube creator data into a local SQLite database. The app focuses on YouTube channel profiles, channel video metadata, and transcripts.

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

Use `npm run start -- test-connection` as the fastest startup check when validating local SQLite alignment. See `docs/app/database.md`.

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

The CLI also exposes `et ui`, a guided terminal shell. It now supports prompt-driven runs for the existing ingest commands, a chained full ingest pipeline, live terminal status updates, and final summaries while keeping the direct commands available.

## Current Workflow

The ingest workflow currently runs as a three-step pipeline:

1. Ingest channel profile data.
2. Ingest channel video metadata and, when saving, json3 transcript versions and segments.
3. Backfill transcripts for stored videos missing transcript rows.

Each ingest command runs in dry-run style by default. Add `--save` to persist results to SQLite.

## Commands

### `ui`

Launches the guided terminal shell for the planned interactive workflow surface.

```sh
npm run start -- ui
et ui
```

`ui` supports these guided actions:

- ingest channel profile
- ingest channel videos
- ingest transcripts
- run the full ingest pipeline
- test connection

The v1 UI is still terminal-first rather than a full dashboard. Existing direct commands below remain supported.

### `ingest-channel-profile <inputs..>`

Fetches YouTube channel profile data.

```sh
npm run start -- ingest-channel-profile @example
npm run start -- ingest-channel-profile channels.txt --save
```

Inputs may be YouTube URLs, handles, channel IDs, or a single input file. A `.txt` file is read as one identifier per line. A `.json` file may be an array of strings or an object with a `channels` array containing `link` or `handle` values.

Options:

- `--save`, `-s`: persist channel profile data.

### `ingest-channel-videos <inputs..>`

Fetches video metadata for channel identifiers. With `--save`, it also downloads preferred English json3 captions, parses them, and stores transcript versions and segments.

```sh
npm run start -- ingest-channel-videos @example --limit 25
npm run start -- ingest-channel-videos channels.txt --limit 100 --batch 10 --save --create-channel
```

Options:

- `--limit <number>`: maximum videos to process per channel. Default: `100`.
- `--batch <number>`: `/videos` metadata page size. Default: `10`.
- `--save`, `-s`: persist video metadata and available json3 transcripts.
- `--create-channel`: create or reuse a creator-backed YouTube channel when saving. Default: `false`.

When saving without `--create-channel`, the command skips channels that are not already in SQLite.

### `ingest-transcripts <inputs..>`

Fetches transcripts for stored videos that do not already have transcript rows.

```sh
npm run start -- ingest-transcripts @example --limit 10
npm run start -- ingest-transcripts channels.txt --limit 50 --save
```

Options:

- `--limit <number>`: maximum transcripts to ingest per channel. Default: `10`.
- `--save`, `-s`: persist transcripts.

When selecting videos, the command expects the channel and video metadata to already exist in the database.

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

Run coverage:

```sh
npm run test:coverage
```

`npm run test:coverage` enforces global minimums of `80%` branch coverage and
`85%` statements, functions, and lines.

Run focused test groups:

```sh
npm run test:commands
npm run test:services
npm run test:lib
```

## Current Notes

- `ingest-channel-videos` now combines channel profile, paged video metadata, and json3 transcript ingestion when `--save` is enabled.
- Transcript storage now uses versioned json3 transcript rows in `transcripts` plus normalized segment rows in `transcript_segments`.
- Channel and video persistence now align with `source_tags`, and channel profile saves use the creator repository to create or reuse a stub Creator keyed by the channel name.
- Because repository SQL is prepared during command import, any future schema/query drift can still block startup. Use `npm run start -- test-connection` after persistence changes.
