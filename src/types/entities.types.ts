export type TagInternalRow = {
  id: number
  name: string
}

export type CreatorRow = {
  id: number
  name: string
  description: string | null
  occupation: string | null
  education: string | null
}

export type CreatorBioRow = {
  creatorId: number
  bio: string
  occupation: string
  education: string
}

export type ChannelRow = {
  id: number
  youtubeChannelId: string
  name: string
  handle: string
  description: string
  followers: number
  sourceTags: string[]
  url: string
  creatorId: number
}

export type VideoRow = {
  id: number
  youtubeVideoId: string
  channelId: number
  title: string
  url: string
  description: string
  duration: number
  uploadDate: string | null
  viewCount: number
  categories: string[]
  sourceTags: string[]
}

export type TranscriptRow = {
  videoId: number
  text: string
}

export type CreatorTagInternalRow = {
  creatorId: number
  tagId: number
}

export type ChannelTagInternalRow = {
  channelId: number
  tagId: number
}

export type CreatorEntity = CreatorRow & {
  bio: CreatorBioEntity | null
  channels: ChannelEntity[]
  internalTags: string[]
}

export type CreatorBioEntity = CreatorBioRow

export type ChannelEntity = ChannelRow & {
  videos: VideoEntity[]
  internalTags: string[]
}

export type VideoEntity = VideoRow & {
  transcript: TranscriptEntity | null
}

export type TranscriptEntity = TranscriptRow

export type TagInternalEntity = TagInternalRow