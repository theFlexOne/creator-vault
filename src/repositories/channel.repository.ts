import db from '../lib/sqlite/db';
import { logger } from '../shared/logger';
import type { ChannelDTO } from '../domain/channel/channel.types';
import { findOrCreateProfileByName } from './profile.repository';

export type StoredChannelRecord = {
    id: number;
    youtubeChannelId: string;
    handle: string;
};

const findChannel = db.prepare(`
    SELECT
        id,
        youtube_channel_id AS youtubeChannelId,
        handle
    FROM channels
    WHERE (@handle IS NOT NULL AND handle = @handle)
        OR (@youtube_channel_id IS NOT NULL AND youtube_channel_id = @youtube_channel_id)
    LIMIT 1
`);

const insertChannel = db.prepare(`
    INSERT INTO channels (
        youtube_channel_id,
        name,
        handle,
        description,
        followers,
        source_metadata_tags,
        url,
        profile_id
    )
    VALUES (
        @youtube_channel_id,
        @name,
        @handle,
        COALESCE(@description, ''),
        COALESCE(@followers, 0),
        COALESCE(@source_metadata_tags, '[]'),
        @url,
        @profile_id
    )
    RETURNING id
`);

const updateChannel = db.prepare(`
    UPDATE channels
    SET
        youtube_channel_id = COALESCE(@youtube_channel_id, youtube_channel_id),
        name = COALESCE(@name, name),
        handle = COALESCE(@handle, handle),
        description = COALESCE(@description, description),
        followers = COALESCE(@followers, followers),
        source_metadata_tags = COALESCE(@source_metadata_tags, source_metadata_tags),
        url = COALESCE(@url, url),
        profile_id = @profile_id
    WHERE id = @id
    RETURNING id
`);

function getYoutubeChannelId(data: ChannelDTO): string | null {
    return data.youtubeChannelId ?? data.ytChannelId ?? null;
}

function findChannelByIdentity(data: ChannelDTO): StoredChannelRecord | undefined {
    return findChannel.get({
        handle: data.handle ?? null,
        youtube_channel_id: getYoutubeChannelId(data),
    }) as StoredChannelRecord | undefined;
}

export function findYoutubeChannelByIdentity(data: ChannelDTO): StoredChannelRecord | undefined {
    return findChannelByIdentity(data);
}

export function upsertYoutubeChannelForProfile(data: ChannelDTO, profileId: number): number {
    if (!data.name || !data.handle || !data.url) {
        throw new Error('Cannot upsert channel without name, handle, and url.');
    }

    const youtubeChannelId = getYoutubeChannelId(data);
    const existingChannel = findChannelByIdentity(data);
    if (!existingChannel && !youtubeChannelId) {
        throw new Error('Cannot insert channel without youtubeChannelId.');
    }

    const channelResult = (existingChannel ? updateChannel : insertChannel).get({
        id: existingChannel?.id,
        youtube_channel_id: youtubeChannelId,
        name: data.name,
        handle: data.handle,
        description: data.description ?? null,
        followers: data.followers ?? null,
        source_metadata_tags: data.tags !== undefined ? JSON.stringify(data.tags) : null,
        url: data.url,
        profile_id: profileId,
    }) as { id: number } | undefined;

    if (!channelResult) {
        throw new Error(`Failed to upsert channel "${data.handle}".`);
    }

    logger.info(`Channel "${data.name}" (ID: ${channelResult.id}) upserted.`);
    return channelResult.id;
}

export function upsertChannelInfo(data: ChannelDTO): number {
    if (!data.name || !data.handle || !data.url) {
        throw new Error('Cannot upsert channel without name, handle, and url.');
    }

    const profile = findOrCreateProfileByName(data.name);
    return upsertYoutubeChannelForProfile(data, profile.id);
}

export function getChannelInternalId(handleOrYoutubeId: string): number | undefined {
    const stmt = db.prepare('SELECT id FROM channels WHERE handle = ? OR youtube_channel_id = ?');
    const result = stmt.get(handleOrYoutubeId, handleOrYoutubeId) as { id: number } | undefined;
    return result?.id;
}

export function getChannelUrl(handleOrYoutubeId: string): string | undefined {
    const stmt = db.prepare('SELECT url FROM channels WHERE handle = ? OR youtube_channel_id = ?');
    const result = stmt.get(handleOrYoutubeId, handleOrYoutubeId) as { url: string } | undefined;
    return result?.url;
}
