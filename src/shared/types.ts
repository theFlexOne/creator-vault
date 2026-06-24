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

export type CreatorChannelDTO = {
    creatorId?: number
    channelId?: number

    // Optional app-facing aliases.
    creatorName?: string
    channelHandle?: string
}
