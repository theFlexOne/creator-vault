# Future Transcript Schema TODO

This note records the intended transcript storage shape for the later real-ingestion implementation. It is documentation only; no production schema migration is applied in the refactor-only ingest rename pass.

## Intended Tables

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

## Versioning Rule

- If the raw json3 checksum is unchanged for a video, caption source, and language, skip inserting a new transcript version.
- If the checksum changed, insert the next transcript version and its normalized segments.

## Storage Policy

- Store the raw json3 payload in SQLite so normalized segments can be audited against the original source.
- Treat temp json3 files as staging only; the database is the durable transcript store.
- Prefer manual English captions first, then automatic English captions when manual captions are unavailable.

## Implementation Pointers

- Parser skeleton: `src/transcripts/json3Parser.ts:27`.
- Parser TODO diagnostic: `src/transcripts/json3Parser.ts:36`.
- Caption download contract: `src/ingest/youtubeSource.ts:31`.
- Caption selection policy TODO: `src/ingest/youtubeSource.ts:54`.
- Transcript version types: `src/ingest/ingestStorage.ts:33` and `src/ingest/ingestStorage.ts:43`.
- Transcript segment type: `src/ingest/ingestStorage.ts:52`.
- Transcript version and segment save methods: `src/ingest/ingestStorage.ts:70` and `src/ingest/ingestStorage.ts:71`.
