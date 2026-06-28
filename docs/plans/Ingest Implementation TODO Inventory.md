# Ingest Implementation TODO Inventory

This note records the real-ingestion work still left after the schema/repository alignment pass.

## Remaining Implementation Work

- Replace the older per-video metadata fanout with one-request channel/video metadata retrieval.
  Current implementation path: `src/services/ingestChannelVideos.service.ts:98` gets URLs first, then `src/services/ingestChannelVideos.service.ts:113` retrieves video info per batch. The future source shape is noted at `src/ingest/youtubeSource.ts:11`.

- Validate chunk-size behavior for `/videos` metadata ingestion.
  Placeholder range type is `src/ingest/youtubeSource.ts:3`, and playlist range TODO is `src/ingest/youtubeSource.ts:45`.

- Make `ingest-channel-videos` ingest channel profile data, video metadata, and transcripts in one workflow.
  Current module TODO is `src/ingest/ingest.module.ts:19`. Current videos-only implementation starts at `src/services/ingestChannelVideos.service.ts:14`.

- Keep `ingest-transcripts` independently runnable for transcript backfills and repairs.
  Current module TODO is `src/ingest/ingest.module.ts:25`. Independent implementation is `src/services/ingestTranscripts.service.ts:9`.

- Implement missing-channel creation with a stub Creator named from the YouTube channel name inside the ingest storage flow.
  Storage policy/types start at `src/ingest/ingestStorage.ts:3`. Stub creator method is `src/ingest/ingestStorage.ts:63`, with TODO at `src/ingest/ingestStorage.ts:81`. Current skip behavior is `src/services/ingestChannelVideos.service.ts:90`.

- Implement manual English caption selection with automatic English fallback.
  Caption request/source types are `src/ingest/youtubeSource.ts:15` and `src/ingest/youtubeSource.ts:21`. Policy TODO is `src/ingest/youtubeSource.ts:54`. Schema note also records it at `docs/plans/Future Transcript Schema TODO.md:41`.

- Download json3 captions into a temp directory as staging only.
  Source method is `src/ingest/youtubeSource.ts:31`. Temp provider is `src/ingest/ingest.dependencies.ts:13`. Workflow TODO is `src/ingest/ingest.module.ts:20`.

- Implement json3 parser event traversal, text run collapsing, timing, empty event filtering, and checksum behavior.
  Parser skeleton is `src/transcripts/json3Parser.ts:27`. Exact parser TODO diagnostic is `src/transcripts/json3Parser.ts:36`.

- Persist transcript versions, raw json3 payloads, checksums, and normalized segments through `IngestStorage`.
  Version input/record types are `src/ingest/ingestStorage.ts:33` and `src/ingest/ingestStorage.ts:43`. Segment type is `src/ingest/ingestStorage.ts:52`. Save methods are `src/ingest/ingestStorage.ts:70` and `src/ingest/ingestStorage.ts:71`.

- Remove remaining compatibility cleanup around legacy repository assumptions after the real source and storage adapters replace transitional wiring.
  Current alignment note is `docs/app/database.md`. Transitional repository assumptions were fixed in the repository layer, but storage/orchestration follow-up still remains.

- Remove remaining compatibility TODOs after the real source and storage adapters replace transitional wiring.
  Current delegation is `src/ingest/ingest.module.ts:13`. Default wiring still uses it at `src/ingest/index.ts:44`.
