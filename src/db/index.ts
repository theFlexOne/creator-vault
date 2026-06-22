import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

// Retrieve DB path from environment or default to src/db/db.sqlite
const dbDir = path.resolve(process.cwd(), 'src/db')
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const defaultDbPath = path.join(dbDir, 'db.sqlite')
const dbPath = process.env.DATABASE_PATH || defaultDbPath

// Initialize and export the database connection
export const db: Database.Database = new Database(dbPath)

// Enable foreign key support
db.pragma('foreign_keys = ON')

export interface Tag {
  name: string
}

export interface Creator {
  id?: number
  name: string
  description?: string
  occupation?: string
  education?: string
}

export interface SocialPlatform {
  name: string
}

export interface CreatorSocial {
  creator_id: number
  platform: string
  url?: string
  handle?: string
}

export interface Channel {
  id?: number
  youtube_channel_id?: string
  name: string
  handle: string
  description?: string
  followers?: number
  tags?: string
  url: string
}

export interface Video {
  id: string
  channel_id: number
  title: string
  url: string
  description?: string
  duration?: number
  upload_date?: string
  view_count?: number
  categories?: string
  tags?: string
  transcript?: string
}

export interface Transcript {
  video_id: string
  content: string
}

export interface CreatorChannel {
  creator_id: number
  channel_id: number
}
