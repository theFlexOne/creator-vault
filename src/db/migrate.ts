import db from '../lib/sqlite/db'
import { logger } from '../shared/logger'
import { readdirSync, readFileSync } from 'fs'
import { resolve } from 'path'

export function migrateAndSeed() {
  logger.info('Starting SQLite schema migration and seeding...')

  const runMigration = db.transaction(() => {

    // 1. Load schema from SQL file
    const schemaPath = resolve(process.cwd(), 'src/db/schema.sql')
    const schemaSql = readFileSync(schemaPath, 'utf-8')
    db.exec(schemaSql)

    logger.info('Loaded schema.sql successfully.')

    // 2. Load SQL seed files in deterministic order
    const seedsDir = resolve(process.cwd(), 'src/db/seeds')
    const seedFiles = readdirSync(seedsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, 'en'))

    for (const seedFile of seedFiles) {
      const seedPath = resolve(seedsDir, seedFile)
      const seedSql = readFileSync(seedPath, 'utf-8')
      db.exec(seedSql)
      logger.info(`Loaded ${seedFile}.`)
    }

    logger.info(`Loaded ${seedFiles.length} SQL seed files.`)
  })

  try {
    runMigration()
    logger.success('Database migration and seeding completed successfully!')
  } catch (error) {
    logger.error('Database migration/seeding failed:', error)
    throw error
  }
}

// Execute migration if script is run directly
if (require.main === module) {
  migrateAndSeed()
}
