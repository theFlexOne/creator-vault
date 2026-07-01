# Current Transcript Schema And Follow-Up

This file name is historical. The current production schema already uses the transcript model documented here. The remaining ingest work is storage wiring and orchestration cleanup, not transcript table creation.

## Current Tables

```sql
transcripts (
  transcript_id,
  video_id,
  caption_source,
  language,
  version,
  raw_format,
  raw_blob,
  checksum,
  created_at
);

transcript_segments (
  segment_id,
  transcript_id,
  idx,
  start_ms,
  end_ms,
  text,
  speaker,
  confidence
);
```

## Current Versioning Rule

- If the raw json3 checksum is unchanged for a video, caption source, and language, skip inserting a new transcript version.
- If the checksum changed, insert the next transcript version and its normalized segments.

## Current Storage Policy

- Store the raw json3 payload in SQLite so normalized segments can be audited against the original source.
- Treat temp json3 files as staging only; the database is the durable transcript store.
- Prefer manual English captions first, then automatic English captions when manual captions are unavailable.

## Remaining Follow-Up

- Keep `ingest-transcripts` independently runnable for backfills and repairs against the existing `transcripts` table.
- Legacy plain-text transcript workflow services and tests have been removed; new transcript behavior lives in `src/ingest/` and `src/transcripts/`.

## Implementation Pointers

- Parser types: `src/transcripts/json3Parser.ts:3`.
- Parser implementation: `src/transcripts/json3Parser.ts:63`.
- Caption download contract: `src/ingest/youtubeSource.ts:36`.
- Caption selection policy: `src/ingest/youtubeSource.ts:119`.
- Transcript version types: `src/ingest/ingestStorage.ts:33` and `src/ingest/ingestStorage.ts:43`.
- Transcript segment type: `src/ingest/ingestStorage.ts:52`.
- Transcript version and segment save methods: `src/ingest/ingestStorage.ts:70` and `src/ingest/ingestStorage.ts:71`.
