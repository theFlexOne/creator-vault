# Ingest Workflows

The public workflow vocabulary is `ingest`, but the implementation still delegates to legacy workflow services. The boundary is explicit:

- `src/commands/*` expose yargs commands.
- `src/ingest/index.ts` exports the public ingest functions used by commands.
- `src/ingest/ingest.module.ts` defines the future module boundary.
- `src/ingest/legacyWorkflow.adapter.ts` delegates to existing services.
- `src/services/*` contain the current working workflow implementations.

## Current Pipeline

The current app uses a three-step YouTube pipeline.

### 1. Channel Profile

`ingest-channel-profile` resolves input identifiers and fetches channel profile data with `getChannelInfo`.

With `--save`, it calls `upsertChannelInfo`. Without `--save`, it logs fetched data.

### 2. Channel Videos

`ingest-channel-videos` resolves input identifiers, fetches channel info, discovers video URLs, fetches video metadata in batches, and optionally stores videos.

With `--save`, the command expects the channel to already exist in SQLite. Missing channels are skipped and counted as failures. The current implementation does not create a missing creator/channel automatically.

### 3. Transcripts

`ingest-transcripts` resolves input identifiers, looks up each channel in SQLite, selects videos without transcript rows, fetches transcripts, and optionally stores them.

This command remains independently runnable for backfills and repairs.

## Current Limits

- The deeper ingest module is not fully implemented yet; it preserves behavior by delegating to the legacy workflow adapter.
- `ingest-channel-videos` does not yet ingest channel profile data, video metadata, and transcripts in one workflow.
- Missing-channel creation with a stub Creator is planned but not implemented.
- Transcript ingestion currently stores plain text in `transcripts(video_id, text)`.
- json3 caption download, parsing, transcript versioning, and segment storage are planned in `docs/plans/Future Transcript Schema TODO.md`.

## Planning Boundary

Keep future implementation detail in `docs/plans/`. The most relevant planning docs are:

- `docs/plans/Ingest Implementation TODO Inventory.md`
- `docs/plans/Future Transcript Schema TODO.md`
- `docs/plans/Real Ingest Implementation Guide Plan With Review Gates.md`
