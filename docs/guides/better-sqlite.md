# Better-SQLite3 Guide

This is the project-specific SQLite guide for Creator Vault. It replaces the older generic `docs/better-sqlite-guide.md` material with practices that match the current codebase.

## Connection Pattern

Use the shared database connection from `src/lib/sqlite/db.ts`:

```ts
import db from '../lib/sqlite/db';
```

The shared connection opens `src/db/db.sqlite`, creates `src/db/` if needed, and enables foreign keys:

```ts
db.pragma('foreign_keys = ON');
```

Set `DB_VERBOSE_SQL=1` to log executed SQL through the app logger.

## Prepared Statements

Define prepared statements once at module scope and reuse them. This is the pattern used by the repositories.

```ts
const getChannel = db.prepare('SELECT id FROM channels WHERE handle = ? OR youtube_channel_id = ?');

export function getChannelInternalId(identifier: string): number | undefined {
    const result = getChannel.get(identifier, identifier) as { id: number } | undefined;
    return result?.id;
}
```

Use positional parameters for small queries and named parameters when inserting or updating structured DTOs.

## Transactions

Use `db.transaction(fn)` for multi-row writes. If the function throws, SQLite rolls back the transaction.

```ts
const insertMany = db.transaction((items: Array<{ name: string }>) => {
    for (const item of items) {
        insertItem.run(item.name);
    }
});
```

This is the right pattern for batched video and transcript writes.

## Constraints And JSON Columns

The canonical schema uses foreign keys, uniqueness constraints, and JSON validity checks. When writing repository code:

- Keep `PRAGMA foreign_keys = ON`.
- Serialize arrays with `JSON.stringify`.
- Match repository column names to `src/db/schema.sql`.
- Prefer `INSERT ... ON CONFLICT ... DO UPDATE` for idempotent ingest writes.

## Backups And Dumps

Use project scripts for routine inspection:

```sh
npm run db:dump:schema
npm run db:dump:table -- <table-name>
npm run db:dump:data
```

For file-level backup behavior, use the existing scripts in `src/db/scripts/` before adding new backup code.

## What Was Not Carried Forward

The previous guide contained broad `better-sqlite3` tutorial examples using stale project paths and older table names. Those examples were not preserved here. Current app schema documentation belongs in `docs/app/database.md`; this guide is only for reusable SQLite practices.
