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
- `transcripts`: one plain-text transcript row per video.
- `creator_tags_internal`: creator-to-tag join table.
- `channel_tags_internal`: channel-to-tag join table.

`channels.source_tags` and `videos.source_tags` store JSON arrays. `videos.categories` also stores a JSON array.

## Current Transcript Shape

The current durable transcript table is:

```sql
transcripts (
  video_id INTEGER PRIMARY KEY,
  text TEXT NOT NULL
)
```

Versioned json3 transcript storage and normalized transcript segments are planned but not implemented. See `docs/plans/Future Transcript Schema TODO.md`.

## Known Schema And Repository Drift

Before changing persistence behavior, check the current source and the plan docs together.

Known drift:

- `src/db/schema.sql` uses `source_tags`, while some repository SQL still refers to `tags`.
- The current `channels` schema requires `creator_id`, while channel upsert code does not provide one.
- Some older database artifacts include legacy tables such as `tags`, `creator_channels`, `creator_tags`, and `channel_tags`.
- Future transcript version tables are documented in plans only; they are not in the current production schema.

Runtime impact:

- Repository statements are prepared at module import time.
- With the checked-in `src/db/db.sqlite`, CLI startup currently fails with `SqliteError: table channels has no column named tags` before yargs can print help.
- `npm run compile` and `npm test` still pass because they do not exercise that exact runtime import path against the checked-in database in the same way.

Treat `src/db/schema.sql` as the canonical schema target and treat the repository drift as implementation work, not documentation truth.
