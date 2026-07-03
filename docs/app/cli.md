# CLI Reference

The CLI binary is `et`. During development, run it through npm:

```sh
npm run start -- <command>
```

After `npm run build` and `npm link`, run:

```sh
et <command>
```

Current runtime note: command imports prepare repository SQL during startup. If `src/db/db.sqlite` drifts from the repository queries, even `--help` can fail before yargs prints command help. Run `npm run start -- test-connection` after persistence changes; see `docs/app/database.md`.

## `ui`

Launches the guided terminal shell for the interactive CLI surface.

Examples:

```sh
npm run start -- ui
et ui
```

Current UI behavior:

- opens the top-level workflow menu
- prompts for the same options as the direct ingest commands
- requires an explicit confirmation before any save-enabled run
- streams workflow log output with in-place status updates
- renders a final summary for each run, including the chained full ingest pipeline

Use `Ctrl+C` to cancel the prompt at any time.

## Shared Input Behavior

Ingest commands accept direct identifiers or one input file.

Direct identifiers can be YouTube handles, channel IDs, or URLs depending on the command. If exactly one argument points to an existing file, the CLI expands that file:

- `.txt`: one identifier per non-empty line.
- `.json`: either an array of strings, or an object with a `channels` array where each item has a `link` or `handle`.

If file parsing fails, the command logs the error and resolves to an empty input list.

## `ingest-channel-profile <inputs..>`

Fetches channel profile data through the current channel profile workflow.

Examples:

```sh
npm run start -- ingest-channel-profile @example
npm run start -- ingest-channel-profile https://www.youtube.com/@example --save
npm run start -- ingest-channel-profile channels.txt --save
```

Options:

- `--save`, `-s`: save channel profile data to SQLite. Default: `false`.

Without `--save`, channel data is logged but not persisted.

## `ingest-channel-videos <inputs..>`

Fetches video metadata for each channel identifier. With `--save`, it also downloads preferred English json3 captions, parses them, and stores transcript versions and segments.

Examples:

```sh
npm run start -- ingest-channel-videos @example
npm run start -- ingest-channel-videos @example --limit 50 --batch 10
npm run start -- ingest-channel-videos channels.txt --limit 100 --batch 10 --save --create-channel
```

Options:

- `--limit <number>`: maximum videos to process per channel. Default: `100`.
- `--batch <number>`: `/videos` metadata page size. Default: `10`.
- `--save`, `-s`: save video metadata to SQLite. Default: `false`.
- `--create-channel`: create or reuse a creator-backed YouTube channel when saving. Default: `false`.

`--limit` and `--batch` must be greater than zero.

When `--save` and `--create-channel` are enabled, the command creates or reuses a creator-backed YouTube channel, saves video metadata, and stores new transcript versions plus segments for downloaded json3 captions. With `--save` alone, channels missing from SQLite are skipped. Without `--save`, it retrieves channel profile and video metadata but does not write to SQLite or download captions.

## `ingest-transcripts <inputs..>`

Fetches transcripts for videos already stored for each channel.

Examples:

```sh
npm run start -- ingest-transcripts @example
npm run start -- ingest-transcripts @example --limit 25 --save
npm run start -- ingest-transcripts channels.txt --limit 50 --save
```

Options:

- `--limit <number>`: maximum transcripts to ingest per channel. Default: `10`.
- `--save`, `-s`: save transcripts to SQLite. Default: `false`.

`--limit` must be greater than zero.

The command looks up the channel in SQLite, selects stored videos missing transcript rows, downloads preferred English json3 captions, parses them, and stores transcript versions plus segments only when `--save` is enabled. It does not create channels, retrieve channel profile data, or retrieve video metadata again.

## `test-connection`

Runs diagnostics for:

- SQLite connectivity.
- YouTube downloader executable availability.
- Basic YouTube network reachability.

Example:

```sh
npm run start -- test-connection
```

Network failure is logged as a warning because restricted or offline environments may still be useful for local development and testing.

## `ui` Full Pipeline

The `run full ingest pipeline` menu action performs these steps in order:

1. `ingest-channel-profile`
2. `ingest-channel-videos`
3. `ingest-transcripts`

The UI collects shared inputs once, carries the same dry-run or save choice through the whole flow, and stops early if an earlier step fails materially.
