import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { logger } from '../logger'

// Retrieve DB path from environment or default to src/db/db.sqlite
const dbDir = path.resolve(process.cwd(), 'src/db')
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const defaultDbPath = path.join(dbDir, 'db.sqlite')
const dbPath = defaultDbPath
const shouldLogSql = process.env.DB_VERBOSE_SQL === '1'

const dbOptions: Database.Options = shouldLogSql ? { verbose: logger.info } : {}
const db: Database.Database = new Database(dbPath, dbOptions)

db.pragma('foreign_keys = ON')

export default db
export { defaultDbPath, dbDir }