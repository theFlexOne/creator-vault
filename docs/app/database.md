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

- `tags_internal`: internal tag names.
- `creators`: core creator identity rows.
- `creator_bios`: extended creator biography fields.
- `channels`: YouTube channel metadata owned by one creator.
- `videos`: YouTube video metadata owned by one channel.
- `transcripts`: versioned transcript metadata and raw json3 payloads per video.
- `transcript_segments`: normalized segment rows for each stored transcript version.
- `creator_tags_internal`: creator-to-tag join table.
- `channel_tags_internal`: channel-to-tag join table.

`channels.source_tags` and `videos.source_tags` store JSON arrays. `videos.categories` also stores a JSON array.

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

## Known Schema And Repository Drift

Before changing persistence behavior, check the current source and the plan docs together.

Known drift:

- `src/db/schema.sql` uses `source_tags`, while some repository SQL still refers to `tags`.
- The current `channels` schema requires `creator_id`, while channel upsert code does not provide one.
- Some older database artifacts include legacy tables such as `tags`, `creator_channels`, `creator_tags`, and `channel_tags`.
- Transcript versioning and segment storage are already present in the current production schema and repository code.

Runtime impact:

- Repository statements are prepared at module import time.
- With the checked-in `src/db/db.sqlite`, CLI startup currently fails with `SqliteError: table channels has no column named tags` before yargs can print help.
- `npm run compile` and `npm test` still pass because they do not exercise that exact runtime import path against the checked-in database in the same way.

Treat `src/db/schema.sql` as the canonical schema target and treat the repository drift as implementation work, not documentation truth.
