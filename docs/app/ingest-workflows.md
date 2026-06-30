# Ingest Workflows

The public workflow vocabulary is `ingest`. The boundary is explicit:

- `src/commands/*` expose yargs commands.
- `src/ingest/index.ts` exports the public ingest functions used by commands.
- `src/ingest/ingest.module.ts` orchestrates ingest workflows through source, storage, parser, temp-directory, and reporter dependencies.
- `src/services/*` contain legacy workflow implementations retained until final cleanup.

## Current Pipeline

The current app uses a three-step YouTube pipeline.

### 1. Channel Profile

`ingest-channel-profile` resolves input identifiers and retrieves channel profile data through `YoutubeSource`.

With `--save`, ingest storage creates or reuses the stub Creator keyed by the YouTube channel name, then saves or reuses the YouTube channel with that `creator_id`. Without `--save`, channel data is logged and no storage write is made.

### 2. Channel Videos

`ingest-channel-videos` resolves input identifiers, retrieves channel profile data, retrieves `/videos` metadata pages in batches, and optionally stores videos plus json3 transcript versions and segments.

With `--save`, ingest storage creates or reuses the creator-backed YouTube channel, saves retrieved videos, downloads preferred English json3 captions, parses them, and saves transcript versions plus normalized segments. Without `--save`, it retrieves profile and video metadata but does not write to SQLite or download captions.

### 3. Transcripts

`ingest-transcripts` resolves input identifiers, looks up each existing channel through ingest storage, selects stored videos without transcript rows, downloads preferred English json3 captions, parses them, and optionally stores transcript versions plus normalized segments.

This command remains independently runnable for backfills and repairs. It does not fetch channel profile data or video metadata.

## Current Notes

- The ingest module now owns direct orchestration for the public ingest commands.
- Legacy service-level workflows remain in `src/services/*` until the final cleanup phase.
- `ingest-channel-videos` now ingests channel profile data, video metadata, and json3 transcripts in one workflow when `--save` is enabled.
- Transcript ingestion now stores versioned json3 transcript blobs in `transcripts` and parsed rows in `transcript_segments`.
- `src/repositories/transcript.repository.ts` handles transcript version lookup, deduplication, and segment storage.
- `src/ingest/ingestStorage.ts` maps ingest orchestration to the creator, channel, video, and transcript repositories while keeping DB access out of core orchestration.

## Planning Boundary

Keep future implementation detail in `docs/plans/`. The most relevant planning docs are:

- `docs/plans/plan-status.md`
- `docs/plans/Ingest Implementation TODO Inventory.md`
- `docs/plans/Future Transcript Schema TODO.md`
- `docs/plans/Real Ingest Implementation Guide Plan With Review Gates.md`
