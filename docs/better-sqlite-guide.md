# Better-SQLite3 Integration & Reference Guide

This guide provides a comprehensive overview of using `better-sqlite3` in TypeScript, structured from basic connections to advanced query structures, performance optimizations, and error handling. 

---

## 1. Getting Started: Initialization & Connection

`better-sqlite3` is a fast, synchronous SQLite3 library for Node.js. In this project, the database connection is initialized and configured in `src/db/index.ts`.

### Basic Connection
```typescript
import Database from 'better-sqlite3';

// Open a SQLite database file. It will be created if it does not exist.
const db = new Database('path/to/database.db', {
  verbose: console.log // Optional: logs all executed SQL queries
});

// Configure standard SQLite PRAGMAs
db.pragma('foreign_keys = ON'); // Enables foreign key constraint enforcement
```

### Connection Options
When creating a `new Database()`, you can pass an options object:
- `readonly` (boolean, default: `false`): Open the database in read-only mode.
- `fileMustExist` (boolean, default: `false`): If the database file is missing, throw an exception instead of creating a new one.
- `timeout` (number, default: `5000`): The number of milliseconds to wait before throwing a `SQLITE_BUSY` error when a table is locked by another connection.

---

## 2. Prepared Statements & Parameter Binding

To prevent **SQL Injection** and optimize execution performance, always use prepared statements. SQLite pre-compiles prepared statements, making repeated executions much faster.

Never concatenate strings to build queries:
```typescript
// ❌ DANGEROUS - Vulnerable to SQL injection!
db.prepare(`SELECT * FROM creators WHERE name = '${userInput}'`).get();
```

Instead, always use parameterized queries. `better-sqlite3` supports positional and named parameters:

### A. Positional Parameters (`?`)
Pass parameters as sequential arguments or as an array.
```typescript
// Pass as sequential arguments
const creator = db.prepare('SELECT * FROM creators WHERE occupation = ? AND education = ?')
                  .get('Apologist', 'Ph.D');

// Pass as an array
const channel = db.prepare('SELECT * FROM channels WHERE handle = ?')
                  .get(['@DrBobbyConway']);
```

### B. Named Parameters (`$name`, `:name`, `@name`)
Pass parameters as an object where keys match the parameter names.
```typescript
// Named parameters with "$" prefix
const insertCreator = db.prepare(`
  INSERT INTO creators (name, occupation, website)
  VALUES ($name, $occupation, $website)
`);

insertCreator.run({
  name: 'Alisa Childers',
  occupation: 'Author/Apologist',
  website: 'https://alisachilders.com'
});
```

---

## 3. Basic CRUD Operations

Here are complete examples for the four basic database operations: **Create**, **Read**, **Update**, and **Delete**.

### Create (Insert)
Use `.run()` for modifications (`INSERT`, `UPDATE`, `DELETE`). It returns an info object containing `changes` (number of rows affected) and `lastInsertRowid` (the auto-incremented primary key).

```typescript
const stmt = db.prepare('INSERT INTO tags (name) VALUES (?)');

// Single Insert
const info = stmt.run('reformed');
console.log(`Successfully inserted row. Generated ID: ${info.lastInsertRowid}`);

// Insert with OR IGNORE to prevent crashing on unique constraint violations
const result = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run('apologetics');
if (result.changes === 0) {
  console.log('Tag already existed, no changes made.');
}
```

### Read (Select)
`better-sqlite3` provides four different methods for fetching query results depending on your needs.

#### 1. Fetching a Single Row (`.get()`)
Returns a single object representing the first matched row, or `undefined` if no matching row is found.
```typescript
const handle = '@DrBobbyConway';
const channel = db.prepare('SELECT * FROM channels WHERE handle = ?')
                  .get(handle) as { id: number; name: string; handle: string } | undefined;

if (channel) {
  console.log(`Found: ${channel.name}`);
} else {
  console.log('Channel not found.');
}
```

#### 2. Fetching Multiple Rows (`.all()`)
Returns an array of objects. If no matches are found, it returns an empty array `[]`.
```typescript
const searchTag = 'reformed';
const query = `
  SELECT c.* FROM creators c
  JOIN creator_tags ct ON c.id = ct.creator_id
  WHERE ct.tag_name = ?
`;
const creators = db.prepare(query).all(searchTag) as any[];
console.log(`Found ${creators.length} creators with the tag "${searchTag}".`);
```

#### 3. Fetching a Single Column (`.pluck()`)
Changes the statement's behavior so that it returns only the value of the first column instead of a row object.
```typescript
// Pluck with .all() returns an array of strings directly
const allTagNames = db.prepare('SELECT name FROM tags').pluck().all() as string[];
console.log(allTagNames); // ['apologetics', 'reformed', ...]

// Pluck with .get() returns a single string directly
const creatorName = db.prepare('SELECT name FROM creators WHERE id = ?').pluck().get(1) as string | undefined;
```

#### 4. Streaming Rows Iteratively (`.iterate()`)
Use `.iterate()` when querying a massive dataset to avoid loading all rows into memory simultaneously. This returns an iterable iterator.
```typescript
const statement = db.prepare('SELECT name, handle FROM channels');

for (const channel of statement.iterate() as IterableIterator<{ name: string; handle: string }>) {
  console.log(`Streaming channel: ${channel.name} (${channel.handle})`);
}
```

### Update
Updates use `.run()` to modify existing records.
```typescript
const updateStmt = db.prepare(`
  UPDATE creators
  SET description = ?, website = ?
  WHERE name = ?
`);

const info = updateStmt.run(
  'Host of the Alisa Childers Podcast.',
  'https://www.alisachilders.com',
  'Alisa Childers'
);

console.log(`Updated ${info.changes} row(s).`);
```

### Delete
Deletes use `.run()` to remove records. If foreign keys with `ON DELETE CASCADE` are enabled, deleting a parent record will clean up related child records in join tables automatically.
```typescript
// Delete a channel (will automatically delete associated entries in creator_channels if foreign keys are ON)
const deleteStmt = db.prepare('DELETE FROM channels WHERE handle = ?');
const info = deleteStmt.run('@DrBobbyConway');

console.log(`Deleted ${info.changes} channel(s).`);
```

---

## 4. Complex Queries with Relational JOINs

Relational joins allow you to bridge tables. For instance, querying channels connected to a specific creator or vice-versa.

```typescript
import { db } from './src/db';

// Find all YouTube channels associated with a specific creator name
const creatorName = 'Doreen Virtue';
const query = `
  SELECT ch.name, ch.handle, ch.link, ch.focus 
  FROM channels ch
  JOIN creator_channels cc ON ch.id = cc.channel_id
  JOIN creators cr ON cr.id = cc.creator_id
  WHERE cr.name = ?
`;

const channels = db.prepare(query).all(creatorName) as any[];
console.log(`Channels for ${creatorName}:`, channels);
```

---

## 5. Running Transactions

Transactions are atomic, consistent, isolated, and durable (ACID). If any operation inside the transaction throws an error, **all** operations within that transaction are rolled back automatically.

`better-sqlite3` handles transactions using `db.transaction(fn)`. It returns a wrapped function that executes your code inside a transaction context.

```typescript
import { db } from './src/db';

// 1. Define the transactional operation
const createCreatorAndChannel = db.transaction((creatorData, channelData) => {
  // Step A: Insert Creator and fetch generated ID
  const creatorResult = db.prepare(`
    INSERT INTO creators (name, occupation) VALUES (?, ?)
  `).run(creatorData.name, creatorData.occupation);
  
  const creatorId = creatorResult.lastInsertRowid as number;

  // Step B: Insert Channel and fetch generated ID
  const channelResult = db.prepare(`
    INSERT INTO channels (name, handle, link) VALUES (?, ?, ?)
  `).run(channelData.name, channelData.handle, channelData.link);
  
  const channelId = channelResult.lastInsertRowid as number;

  // Step C: Link them in the junction/join table
  db.prepare(`
    INSERT INTO creator_channels (creator_id, channel_id) VALUES (?, ?)
  `).run(creatorId, channelId);

  // Return generated IDs to the caller
  return { creatorId, channelId };
});

// 2. Execute the transaction safely
try {
  const result = createCreatorAndChannel(
    { name: 'John Doe', occupation: 'Apologist' },
    { name: 'JD Apologetics', handle: '@jda', link: 'https://youtube.com/@jda' }
  );
  console.log(`Transaction succeeded! Created Creator: ${result.creatorId}, Channel: ${result.channelId}`);
} catch (error) {
  // SQLite will roll back any modifications automatically if an error is thrown
  console.error('Transaction failed and was rolled back:', error);
}
```

---

## 6. Advanced Performance & Database Features

SQLite has a few powerful optimization options that can speed up execution by orders of magnitude.

### Journal Modes: Write-Ahead Logging (WAL)
By default, SQLite uses a rollback journal for atomicity. Switching to **WAL mode** allows readers to read from the database *while* another connection is writing to it, which drastically improves concurrent performance.

To enable WAL mode:
```typescript
db.pragma('journal_mode = WAL');
```

### Custom SQL Functions
You can write custom JavaScript/TypeScript functions and register them to be called directly inside your SQL statements.

```typescript
// Define a slugify function
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Register the function with SQLite
db.function('slugify', slugify);

// Execute it inside an SQL query!
const channels = db.prepare('SELECT name, slugify(name) AS slug FROM channels').all();
```

### Database Backups
You can safely create live backups of an active database without blocking other connections or locking the tables indefinitely.

```typescript
db.backup('backup-file.db')
  .then(() => {
    console.log('Database backup completed successfully!');
  })
  .catch((err) => {
    console.error('Backup failed:', err);
  });
```

---

## 7. Best Practices & Error Handling

### Performance Tips
1. **Reuse Prepared Statements**: Preparing a statement has overhead. Avoid calling `db.prepare()` inside loops. Define statements once in your modules and reuse them.
2. **Use Indexes**: Ensure columns referenced in `WHERE` clauses, `JOIN` conditions, and `UNIQUE` constraints are indexed. Foreign key source/destination columns should always have index coverage.
3. **Synchronous Execution**: Remember that `better-sqlite3` runs synchronously on the main thread. It blocks the event loop. For lightweight relational storage, this overhead is minimal and offers unmatched simplicity. However, avoid running extremely computationally heavy queries directly on the main thread of web servers during high-concurrency requests.

### Error Handling
Wrap queries or database operations in `try...catch` blocks. `better-sqlite3` throws custom errors of type `SqliteError` containing helpful details:

```typescript
try {
  db.prepare('INSERT INTO tags (name) VALUES (?)').run('apologetics');
} catch (error: any) {
  if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    console.error('Primary key constraint violated: Tag already exists!');
  } else {
    console.error('An unexpected database error occurred:', error.message);
  }
}
```

### Safe Connection Shutdown
To ensure all updates are flushed to disk cleanly, close the database connection when shutting down the application.

```typescript
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  db.close();
  process.exit(0);
});
```