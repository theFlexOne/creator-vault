import db from '../lib/sqlite/db';
import { logger } from '../shared/logger';
import type { ChannelDTO } from '../domain/channel/channel.types';

const upsertChannel = db.prepare(`
    INSERT INTO channels (youtube_channel_id, name, handle, description, followers, tags, url)
    VALUES (
        @youtube_channel_id,
        @name,
        @handle,
        COALESCE(@description, ''),
        COALESCE(@followers, 0),
        COALESCE(@tags, '[]'),
        @url
    )
    ON CONFLICT(handle) DO UPDATE SET
        youtube_channel_id = COALESCE(@youtube_channel_id, youtube_channel_id),
        name = COALESCE(@name, name),
        handle = COALESCE(@handle, handle),
        description = COALESCE(@description, description),
        followers = COALESCE(@followers, followers),
        tags = COALESCE(@tags, tags),
        url = COALESCE(@url, url)
    RETURNING id
`);

export function upsertChannelInfo(data: ChannelDTO): number {
    if (!data.name || !data.handle || !data.url) {
        throw new Error('Cannot upsert channel without name, handle, and url.');
    }

    const channelResult = upsertChannel.get({
        youtube_channel_id: data.youtubeChannelId ?? data.ytChannelId ?? null,
        name: data.name,
        handle: data.handle,
        description: data.description ?? null,
        followers: data.followers ?? null,
        tags: data.tags !== undefined ? JSON.stringify(data.tags) : null,
        url: data.url,
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
