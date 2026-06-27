# CLI Reference

The CLI binary is `et`. During development, run it through npm:

```sh
npm run start -- <command>
```

After `npm run build` and `npm link`, run:

```sh
et <command>
```

Current runtime note: command imports prepare repository SQL during startup. If `src/db/db.sqlite` does not match the repository queries, even `--help` can fail before yargs prints command help. The checked-in database currently exposes this as `table channels has no column named tags`; see `docs/app/database.md`.

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

- `--save`, `-s`: save fetched channel profile data to SQLite. Default: `false`.

Without `--save`, fetched channel data is logged but not persisted.

## `ingest-channel-videos <inputs..>`

Fetches video metadata for each channel identifier.

Examples:

```sh
npm run start -- ingest-channel-videos @example
npm run start -- ingest-channel-videos @example --limit 50 --batch 10
npm run start -- ingest-channel-videos channels.txt --limit 100 --batch 20 --save
```

Options:

- `--limit <number>`: maximum videos to process per channel. Default: `100`.
- `--batch <number>`: number of video URLs to fetch metadata for per batch. Default: `20`.
- `--save`, `-s`: save fetched video metadata to SQLite. Default: `false`.

`--limit` and `--batch` must be greater than zero.

When `--save` is enabled, the command looks up the channel in SQLite by YouTube channel ID or handle. If the channel does not exist, that channel is skipped and reported as failed.

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
- `--save`, `-s`: save fetched transcripts to SQLite. Default: `false`.

The command looks up the channel in SQLite, selects stored videos missing transcript rows, fetches transcripts, and stores them only when `--save` is enabled.

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
