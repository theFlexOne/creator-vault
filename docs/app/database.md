# Database

Creator Vault uses local SQLite through `better-sqlite3`.

## Connection

The app opens the database in `src/lib/sqlite/db.ts`.

- Directory: `src/db/`
- Database file: `src/db/db.sqlite`
- Canonical schema file: `src/db/schema.sql`
- Foreign keys: enabled with `PRAGMA foreign_keys = ON`
- SQL logging: set `DB_VERBOSE_SQL=1`

The connection creates `src/db/` if the directory is missing. It does not currently choose a different database path from environment variables.

## Scripts

```sh
npm run db:seed
npm run db:dump:schema
npm run db:dump:table -- <table-name>
npm run db:dump:data
```

`db:seed` reads SQL files from `src/db/seeds/` into `src/db/db.sqlite`.

## Current Canonical Schema

`src/db/schema.sql` defines these current tables:

- `taxonomy_terms`: curated taxonomy terms with `slug`, `label`, `description`, and optional `parent_id`.
- `profiles`: core cross-source identity rows.
- `profile_bios`: extended profile biography fields.
- `channels`: YouTube channel metadata owned by one profile.
- `videos`: YouTube video metadata owned by one channel.
- `transcripts`: versioned transcript metadata and raw json3 payloads per video.
- `transcript_segments`: normalized segment rows for each stored transcript version.
- `profile_taxonomy_terms`: profile-to-taxonomy join table.
- `channel_taxonomy_terms`: optional channel-to-taxonomy join table.

`channels.source_metadata_tags` and `videos.source_metadata_tags` store JSON arrays of imported YouTube labels. `videos.categories` also stores a JSON array.

## Current Transcript Shape

The current durable transcript table is:

```sql
transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL,
  caption_source TEXT NOT NULL,
  language TEXT NOT NULL,
  version INTEGER NOT NULL,
  raw_format TEXT NOT NULL,
  raw_blob TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
```

`transcript_segments` stores the parsed segment rows for each transcript version. See `src/db/schema.sql` for the full transcript schema.

## Current Alignment Notes

Treat `src/db/schema.sql` as the canonical schema.

Current alignment:

- Channel and video repositories write `source_metadata_tags` JSON arrays, matching `channels.source_metadata_tags` and `videos.source_metadata_tags`.
- The profile repository creates or reuses stub rows in `profiles`; channel metadata saves store the resulting `channels.profile_id`.
- Transcript persistence uses the existing versioned `transcripts` table plus `transcript_segments`.
- The production ingest storage adapter uses repository methods for profile-backed channel saves, video saves, transcript version lookup/save, segment saves, and transcript-backfill video selection.
- Transcript-backfill video selection returns both the internal video ID and YouTube video ID so orchestration can store transcript rows by database ID while retrieving captions by YouTube identity.
- Video saves return stored video IDs and YouTube video IDs so orchestration can attach downloaded json3 captions to the correct transcript rows without importing repositories directly.
- Manual taxonomy remains separate from ingest. Ingest writes imported source metadata tags only; it does not assign taxonomy terms.

Legacy artifacts:

- Older seed and migration artifacts under `src/db/seed_old/` still reference retired tables such as `tags`, `creator_channels`, `creator_tags`, and `channel_tags`.
- Keep those files clearly historical; do not treat them as the current production schema.

Runtime note:

- Repository statements are prepared at module import time.
- If a local SQLite file drifts from the repository SQL, startup can still fail before yargs prints command help.
- Run `npm run start -- test-connection` after schema or repository changes to confirm startup reaches diagnostics.
