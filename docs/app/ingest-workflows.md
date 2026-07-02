# Ingest Workflows

The public workflow vocabulary is `ingest`. The boundary is explicit:

- `src/commands/*` expose yargs commands.
- `src/ingest/index.ts` exports the public ingest functions used by commands.
- `src/ingest/ingest.module.ts` orchestrates ingest workflows through source, storage, parser, temp-directory, and reporter dependencies.
- Legacy ingest workflow services have been removed; `src/services/` is no longer an ingest orchestration layer.

## Current Pipeline

The current app uses a three-step YouTube pipeline.

### 1. Channel Profile

`ingest-channel-profile` resolves input identifiers and retrieves channel profile data through `YoutubeSource`.

With `--save`, ingest storage creates or reuses the stub Creator keyed by the YouTube channel name, then saves or reuses the YouTube channel with that `creator_id`. Without `--save`, channel data is logged and no storage write is made.

### 2. Channel Videos

`ingest-channel-videos` resolves input identifiers, retrieves channel profile data, retrieves `/videos` metadata pages in batches, and optionally stores videos plus json3 transcript versions and segments.

With `--save --create-channel`, ingest storage creates or reuses the creator-backed YouTube channel, saves retrieved videos, downloads preferred English json3 captions, parses them, and saves transcript versions plus normalized segments. With `--save` alone, missing channels are skipped. Without `--save`, it retrieves profile and video metadata but does not write to SQLite or download captions.

### 3. Transcripts

`ingest-transcripts` resolves input identifiers, looks up each existing channel through ingest storage, selects stored videos without transcript rows, downloads preferred English json3 captions, parses them, and optionally stores transcript versions plus normalized segments.

This command remains independently runnable for backfills and repairs. It does not create channels, fetch channel profile data, or fetch video metadata.

## Current Notes

- The ingest module now owns direct orchestration for the public ingest commands.
- Public ingest commands no longer delegate to service-level workflow implementations.
- `ingest-channel-videos` now ingests channel profile data, video metadata, and json3 transcripts in one workflow when `--save` is enabled.
- Transcript ingestion now stores versioned json3 transcript blobs in `transcripts` and parsed rows in `transcript_segments`.
- `src/repositories/transcript.repository.ts` handles transcript version lookup, deduplication, and segment storage.
- `src/ingest/ingestStorage.ts` maps ingest orchestration to the creator, channel, video, and transcript repositories while keeping DB access out of core orchestration.

## Planning Boundary

Keep future implementation detail in `docs/plans/`. The primary current planning docs for ingest work are:

- `docs/plans/plan-status.md`
- `docs/plans/Ingest Implementation TODO Inventory.md`

Historical ingest context remains in:

- `docs/plans/Current Transcript Schema And Follow-Up.md`
- `docs/plans/Real Ingest Implementation Guide Plan With Review Gates.md`
