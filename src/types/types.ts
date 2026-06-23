import { CommandModule } from 'yargs'

export type TagDTO = {
  id?: number
  name?: string
}

export type SocialPlatformDTO = {
  name?: string
}

export type CreatorDTO = {
  id?: number
  name?: string
  description?: string
  occupation?: string
  education?: string
}

export type CreatorSocialDTO = {
  creatorId?: number
  creatorName?: string
  platform?: string
  url?: string
  handle?: string
}

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

export type CreatorChannelDTO = {
  creatorId?: number
  channelId?: number

  // Optional app-facing aliases.
  creatorName?: string
  channelHandle?: string
}

export type VideoDTO = {
  id?: string
  channelId?: number
  title?: string
  url?: string
  description?: string
  duration?: number
  uploadDate?: string
  viewCount?: number
  categories?: string
  tags?: string
  transcript?: string

  // Compatibility aliases currently used by existing app code.
  ytVideoId?: string
}

export type TranscriptDTO = {
  videoId?: string
  text?: string
}

export type YTFetchCommand = CommandModule<
  {},
  {
    inputs: string[]
    limit: number
    save: boolean
    batch: number
  }
>
