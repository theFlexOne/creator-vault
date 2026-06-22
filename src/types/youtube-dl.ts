// Import and re-export native types from youtube-dl-exec for consistency
import type { Payload, Thumbnail, Format, AutomaticCaption } from 'youtube-dl-exec'
export type { Payload, Thumbnail, Format, AutomaticCaption }

/**
 * Represents a single video entry in a flat playlist response (when flatPlaylist: true).
 * These entries do NOT contain nested entries - they're always leaf nodes.
 */
export interface FlatEntry {
  id: string
  title: string
  _type: string
  url?: string | null
  duration?: number | null
  channel_id?: string | null
  description?: string | null
  modified_date?: string | null
  view_count?: number | null
  thumbnails?: Thumbnail[] | null
  timestamp?: number | null
  entries?: FlatEntry[]
}

/**
 * Represents a playlist/channel entry that may contain nested entries.
 * Used for hierarchical playlist structures (when flatPlaylist is not used).
 */
export interface Entry {
  id: string
  title: string
  _type: string
  url?: string | null
  thumbnails?: Thumbnail[] | null
  duration?: number | null
  timestamp?: number | null
  ie_key?: string | null
  channel?: string | null
  channel_id?: string | null
  availability?: string | null
  channel_follower_count?: number | null
  description?: string | null
  tags?: string[] | null
  uploader_id?: string | null
  uploader_url?: string | null
  modified_date?: string | null
  view_count?: number | null
  playlist_count?: number | null
  uploader?: string | null
  channel_url?: string | null
  entries?: Entry[]
}

/**
 * Extends the native Payload type with an entries array.
 * Returned when fetching playlists or channels with flatPlaylist: true.
 */
export interface PayloadWithEntries extends Payload {
  entries: FlatEntry[] | Entry[]
}
