// Import and re-export native types from youtube-dl-exec for consistency
import type { Payload, Thumbnail, Format, AutomaticCaption } from 'youtube-dl-exec'
export type { Payload, Thumbnail, Format, AutomaticCaption }

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

export interface PayloadWithEntries extends Payload {
    entries: FlatEntry[] | Entry[]
}
