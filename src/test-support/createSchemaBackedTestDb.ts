import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const schemaSql = readFileSync(resolve(__dirname, '../db/schema.sql'), 'utf8');

export function createSchemaBackedTestDb(): Database.Database {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(schemaSql);
    return db;
}

export function resetSchemaBackedTestDb(db: Database.Database) {
    db.pragma('foreign_keys = ON');
    db.exec(schemaSql);
}
