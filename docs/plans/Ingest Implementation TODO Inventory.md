# Ingest Implementation TODO Inventory

This note records real-ingestion follow-up after the schema/repository, source adapter, parser, storage, and orchestration phases.

## Completed Foundation

- The real YouTube source adapter exists and exposes channel profile retrieval, paged `/videos` metadata retrieval, and json3 caption downloads.
  Source types start at `src/ingest/youtubeSource.ts:9`. The production adapter starts at `src/ingest/youtubeSource.ts:142`.

- Manual English json3 caption selection with automatic English fallback is implemented inside the source adapter.
  Caption request/source types are `src/ingest/youtubeSource.ts:20` and `src/ingest/youtubeSource.ts:26`. Selection logic starts at `src/ingest/youtubeSource.ts:119`.

- The json3 parser traverses events, collapses text runs, calculates timing, skips empty events with diagnostics, and computes a SHA-256 checksum.
  Parser types start at `src/transcripts/json3Parser.ts:3`. Parser implementation starts at `src/transcripts/json3Parser.ts:63`.

- The ingest module now orchestrates channel profiles, channel video pages, json3 caption downloads, parser output, transcript version saves, and transcript segment saves through fakes in tests.
  Current implementation path: `src/ingest/ingest.module.ts`.

- The production storage adapter maps creator-backed channel saves, video saves, transcript version saves, segment saves, and transcript-backfill video selection to repositories.
  Current implementation path: `src/ingest/ingestStorage.ts`.

## Remaining Follow-Up

- Validate chunk-size behavior for `/videos` metadata ingestion.
  Page range type is `src/ingest/youtubeSource.ts:9`. The source-layer default page size is `src/ingest/youtubeSource.ts:7`, and the public CLI `--batch` default is now `10`.

- Decide what to do with ambiguous non-ingest cleanup candidates identified during final cleanup.
  Current candidates include unused prompt helpers, historical seed artifacts, seed conversion scripts, and the `yt-dlp` Postman investigation collection.

## Post-Plan Follow-Up

- Revisit whether Creator should become a fuller user-facing domain workflow after the real ingest plan completes.
  Possible scope includes dedicated creator commands, listing creators, creating creators outside YouTube ingest, editing creator metadata, and linking channels to existing creators instead of always creating/reusing a stub Creator from the YouTube channel name.
