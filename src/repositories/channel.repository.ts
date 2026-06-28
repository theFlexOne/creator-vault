import db from '../lib/sqlite/db';
import { logger } from '../shared/logger';
import type { ChannelDTO } from '../domain/channel/channel.types';

const upsertCreator = db.prepare(`
    INSERT INTO creators (name)
    VALUES (@name)
    ON CONFLICT(name) DO UPDATE SET
        name = excluded.name
    RETURNING id
`);

const findChannel = db.prepare(`
    SELECT id
    FROM channels
    WHERE handle = @handle
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
        source_tags,
        url,
        creator_id
    )
    VALUES (
        @youtube_channel_id,
        @name,
        @handle,
        COALESCE(@description, ''),
        COALESCE(@followers, 0),
        COALESCE(@source_tags, '[]'),
        @url,
        @creator_id
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
        source_tags = COALESCE(@source_tags, source_tags),
        url = COALESCE(@url, url),
        creator_id = @creator_id
    WHERE id = @id
    RETURNING id
`);

export function upsertChannelInfo(data: ChannelDTO): number {
    if (!data.name || !data.handle || !data.url) {
        throw new Error('Cannot upsert channel without name, handle, and url.');
    }

    const youtubeChannelId = data.youtubeChannelId ?? data.ytChannelId ?? null;
    const creatorResult = upsertCreator.get({ name: data.name }) as { id: number } | undefined;

    if (!creatorResult) {
        throw new Error(`Failed to create or reuse creator "${data.name}".`);
    }

    const existingChannel = findChannel.get({
        handle: data.handle,
        youtube_channel_id: youtubeChannelId,
    }) as { id: number } | undefined;

    const channelResult = (existingChannel ? updateChannel : insertChannel).get({
        id: existingChannel?.id,
        youtube_channel_id: youtubeChannelId,
        name: data.name,
        handle: data.handle,
        description: data.description ?? null,
        followers: data.followers ?? null,
        source_tags: data.tags !== undefined ? JSON.stringify(data.tags) : null,
        url: data.url,
        creator_id: creatorResult.id,
    }) as { id: number } | undefined;

    if (!channelResult) {
        throw new Error(`Failed to upsert channel "${data.handle}".`);
    }

    logger.info(`Channel "${data.name}" (ID: ${channelResult.id}) upserted.`);
    return channelResult.id;
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
