# Ingest Implementation TODO Inventory

This note records the real-ingestion work still left after the schema/repository alignment pass and Phase 4 parser implementation.

## Completed Foundation

- The real YouTube source adapter exists and exposes channel profile retrieval, paged `/videos` metadata retrieval, and json3 caption downloads.
  Source types start at `src/ingest/youtubeSource.ts:9`. The production adapter starts at `src/ingest/youtubeSource.ts:142`.

- Manual English json3 caption selection with automatic English fallback is implemented inside the source adapter.
  Caption request/source types are `src/ingest/youtubeSource.ts:20` and `src/ingest/youtubeSource.ts:26`. Selection logic starts at `src/ingest/youtubeSource.ts:119`.

- The json3 parser traverses events, collapses text runs, calculates timing, skips empty events with diagnostics, and computes a SHA-256 checksum.
  Parser types start at `src/transcripts/json3Parser.ts:3`. Parser implementation starts at `src/transcripts/json3Parser.ts:63`.

## Remaining Implementation Work

- Replace the older per-video metadata fanout in orchestration with the source adapter's paged channel/video metadata retrieval.
  Current implementation path: `src/services/ingestChannelVideos.service.ts:98` gets URLs first, then `src/services/ingestChannelVideos.service.ts:113` retrieves video info per batch. The source adapter page shape starts at `src/ingest/youtubeSource.ts:9`.

- Validate chunk-size behavior for `/videos` metadata ingestion.
  Page range type is `src/ingest/youtubeSource.ts:9`. The source-layer default page size is `src/ingest/youtubeSource.ts:7`, while CLI `--batch` finalization remains a later plan phase.

- Make `ingest-channel-videos` ingest channel profile data, video metadata, and transcripts in one workflow.
  Current module TODO is `src/ingest/ingest.module.ts:19`. Current videos-only implementation starts at `src/services/ingestChannelVideos.service.ts:14`.

- Keep `ingest-transcripts` independently runnable for transcript backfills and repairs.
  Current module TODO is `src/ingest/ingest.module.ts:25`. Independent implementation is `src/services/ingestTranscripts.service.ts:9`.

- Implement missing-channel creation with a stub Creator named from the YouTube channel name inside the ingest storage flow.
  Storage policy/types start at `src/ingest/ingestStorage.ts:3`. Stub creator method is `src/ingest/ingestStorage.ts:63`, with TODO at `src/ingest/ingestStorage.ts:81`. Current skip behavior is `src/services/ingestChannelVideos.service.ts:90`.

- Wire json3 caption downloads into orchestration using temp files as staging only.
  Source method is `src/ingest/youtubeSource.ts:36`. Temp provider is `src/ingest/ingest.dependencies.ts:13`. Workflow TODO is `src/ingest/ingest.module.ts:20`.

- Persist transcript versions, raw json3 payloads, checksums, and normalized segments through `IngestStorage`.
  Version input/record types are `src/ingest/ingestStorage.ts:33` and `src/ingest/ingestStorage.ts:43`. Segment type is `src/ingest/ingestStorage.ts:52`. Save methods are `src/ingest/ingestStorage.ts:70` and `src/ingest/ingestStorage.ts:71`.

- Remove remaining compatibility cleanup around legacy repository assumptions after the real source and storage adapters replace transitional wiring.
  Current alignment note is `docs/app/database.md`. Transitional repository assumptions were fixed in the repository layer, but storage/orchestration follow-up still remains.

- Remove remaining compatibility TODOs after the real source and storage adapters replace transitional wiring.
  Current delegation is `src/ingest/ingest.module.ts:13`. Default wiring still uses it at `src/ingest/index.ts:44`.
