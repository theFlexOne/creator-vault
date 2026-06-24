import type { VideoDTO } from '../video/video.types'

export type ChannelDTO = {
    id?: number
    youtubeChannelId?: string
    name?: string
    handle?: string
    description?: string
    followers?: number
    tags?: string[]
    url?: string

    // Compatibility aliases currently used by existing app code.
    ytChannelId?: string
    videos?: VideoDTO[]
}
