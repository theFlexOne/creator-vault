export type TaxonomyTermRow = {
  id: number
  slug: string
  label: string
  description: string
  parentId: number | null
}

export type ProfileRow = {
  id: number
  name: string
  description: string | null
  occupation: string | null
  education: string | null
}

export type ProfileBioRow = {
  profileId: number
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
  sourceMetadataTags: string[]
  url: string
  profileId: number
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
  sourceMetadataTags: string[]
}

export type TranscriptRow = {
  videoId: number
  text: string
}

export type ProfileTaxonomyTermRow = {
  profileId: number
  tagId: number
}

export type ChannelTaxonomyTermRow = {
  channelId: number
  tagId: number
}

export type ProfileEntity = ProfileRow & {
  bio: ProfileBioEntity | null
  channels: ChannelEntity[]
  taxonomyTerms: string[]
}

export type ProfileBioEntity = ProfileBioRow

export type ChannelEntity = ChannelRow & {
  videos: VideoEntity[]
  taxonomyTerms: string[]
}

export type VideoEntity = VideoRow & {
  transcript: TranscriptEntity | null
}

export type TranscriptEntity = TranscriptRow

export type TaxonomyTermEntity = TaxonomyTermRow