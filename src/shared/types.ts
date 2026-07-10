export type TagDTO = {
    id?: number
    name?: string
}

export type SocialPlatformDTO = {
    name?: string
}

export type ProfileDTO = {
    id?: number
    name?: string
    description?: string
    occupation?: string
    education?: string
}

export type ProfileSocialDTO = {
    profileId?: number
    profileName?: string
    platform?: string
    url?: string
    handle?: string
}

export type ProfileChannelDTO = {
    profileId?: number
    channelId?: number

    // Optional app-facing aliases.
    profileName?: string
    channelHandle?: string
}
