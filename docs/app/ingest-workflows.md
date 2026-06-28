# Ingest Workflows

The public workflow vocabulary is `ingest`. The boundary is explicit:

- `src/commands/*` expose yargs commands.
- `src/ingest/index.ts` exports the public ingest functions used by commands.
- `src/ingest/ingest.module.ts` defines the ingest module boundary.
- `src/services/*` contain the current working workflow implementations.

## Current Pipeline

The current app uses a three-step YouTube pipeline.

### 1. Channel Profile

`ingest-channel-profile` resolves input identifiers and retrieves channel profile data with `getChannelInfo`.

With `--save`, it calls `upsertChannelInfo`. Without `--save`, it logs retrieved data.

### 2. Channel Videos

`ingest-channel-videos` resolves input identifiers, retrieves channel info, discovers video URLs, retrieves video metadata in batches, and optionally stores videos.

With `--save`, the command expects the channel to already exist in SQLite. Missing channels are skipped and counted as failures. The current implementation does not create a missing creator/channel automatically.

### 3. Transcripts

`ingest-transcripts` resolves input identifiers, looks up each channel in SQLite, selects videos without transcript rows, retrieves transcripts, and optionally stores them.

This command remains independently runnable for backfills and repairs.

## Current Notes

- The ingest module is still transitional, but the public command surface already uses `ingest` names.
- `ingest-channel-videos` does not yet ingest channel profile data, video metadata, and transcripts in one workflow.
- Missing-channel creation with a stub Creator is planned but not implemented.
- Transcript ingestion now stores versioned json3 transcript blobs in `transcripts` and parsed rows in `transcript_segments`.
- `src/repositories/transcript.repository.ts` handles transcript version lookup, deduplication, and segment storage.

## Planning Boundary

Keep future implementation detail in `docs/plans/`. The most relevant planning docs are:

- `docs/plans/Ingest Implementation TODO Inventory.md`
- `docs/plans/Future Transcript Schema TODO.md`
- `docs/plans/Real Ingest Implementation Guide Plan With Review Gates.md`
