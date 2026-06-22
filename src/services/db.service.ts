import { db } from '../db';
import { VideoTranscript } from '../lib/yt-dlp/getChannelTranscripts';
import { logger } from '../logger';
import { ChannelDTO, VideoDTO } from '../types/types';

const upsertChannel = db.prepare(`
    INSERT INTO channels (youtube_channel_id, name, handle, description, followers, tags, url)
    VALUES (@youtube_channel_id, @name, @handle, @description, @followers, @tags, @url)
    RETURNING id
`);

const updateChannelById = db.prepare(`
    UPDATE channels
    SET
        youtube_channel_id = COALESCE(@youtube_channel_id, youtube_channel_id),
        name = COALESCE(@name, name),
        handle = COALESCE(@handle, handle),
        description = COALESCE(@description, description),
        followers = COALESCE(@followers, followers),
        tags = COALESCE(@tags, tags),
        url = COALESCE(@url, url)
    WHERE id = @id
`);

const upsertVideo = db.prepare(`
    INSERT INTO videos (id, channel_id, title, url, description, duration, upload_date, view_count, categories, tags, transcript)
    VALUES (@id, @channel_id, @title, @url, @description, @duration, @upload_date, @view_count, @categories, @tags, @transcript)
    ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        url = excluded.url,
        description = excluded.description,
        duration = excluded.duration,
        upload_date = excluded.upload_date,
        view_count = excluded.view_count,
        categories = excluded.categories,
        tags = excluded.tags,
        transcript = excluded.transcript
`);

const upsertTranscript = db.prepare(`
    INSERT INTO transcripts (video_id, text)
    VALUES (?, ?)
    ON CONFLICT(video_id) DO UPDATE SET
        text = excluded.text
`);

export function upsertChannelData(data: ChannelDTO): number {
    const youtubeChannelId = data.youtubeChannelId ?? data.ytChannelId ?? null;

    if (data.id !== undefined) {
        const info = updateChannelById.run({
            id: data.id,
            youtube_channel_id: youtubeChannelId,
            name: data.name ?? null,
            handle: data.handle ?? null,
            description: data.description ?? null,
            followers: data.followers ?? null,
            tags: data.tags ?? null,
            url: data.url ?? null,
        });

        if (info.changes === 0) {
            throw new Error(`No channel found for primary key id=${data.id}.`);
        }

        logger.info(`Channel "${data.name ?? data.handle ?? data.id}" (ID: ${data.id}) updated by primary key.`);
        return data.id;
    }

    if (!data.name || !data.handle || !data.url) {
        throw new Error('Cannot insert channel without name, handle, and url when no primary key id is provided.');
    }

    const channelResult = upsertChannel.get({
        youtube_channel_id: youtubeChannelId,
        name: data.name,
        handle: data.handle,
        description: data.description ?? '',
        followers: data.followers ?? 0,
        tags: data.tags ?? '[]',
        url: data.url,
    }) as { id: number };

    logger.info(`Channel "${data.name}" (ID: ${channelResult.id}) updated/inserted.`);
    return channelResult.id;
}

export function upsertVideoData(channelId: number, videos: VideoDTO[]): number {
    if (!videos || videos.length === 0) {
        logger.info('No videos to upsert for channel ID: ' + channelId);
        return 0;
    }

    const insertManyVideos = db.transaction((videoList: VideoDTO[]) => {
        let count = 0;

        for (const video of videoList) {
            const videoId = video.id ?? video.ytVideoId;

            if (!videoId) {
                logger.warn(`Skipping video with no ID: ${video.title ?? 'unknown title'}`);
                continue;
            }

            const info = upsertVideo.run({
                id: videoId,
                channel_id: channelId,
                title: video.title ?? '',
                url: video.url ?? '',
                description: video.description ?? '',
                duration: video.duration ?? 0,
                upload_date: video.uploadDate ?? null,
                view_count: video.viewCount ?? 0,
                categories: video.categories ?? '[]',
                tags: video.tags ?? '[]',
                transcript: video.transcript ?? '[]',
            });

            if (info.changes > 0) count++;
        }

        return count;
    });

    const insertedCount = insertManyVideos(videos);
    logger.info(`Processed ${videos.length} videos. Actually inserted/updated: ${insertedCount}`);
    return insertedCount;
}

export function upsertTranscriptData(transcripts: VideoTranscript[]): number {
    const insertManyTranscripts = db.transaction((transcriptList: VideoTranscript[]) => {
        let count = 0;
        for (const t of transcriptList) {
            upsertTranscript.run(t.videoId, t.transcript);
            count++;
        }
        return count;
    });

    const storedCount = insertManyTranscripts(transcripts);
    logger.info(`Successfully stored ${storedCount} transcripts.`);
    return storedCount;
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

export function getVideosMissingTranscripts(channelInternalId: number, limit?: number): { id: string }[] {
    let query = `
        SELECT id FROM videos 
        WHERE channel_id = ? AND id NOT IN (SELECT video_id FROM transcripts)
    `;
    const params: (string | number)[] = [channelInternalId];

    if (limit) {
        query += ` LIMIT ?`;
        params.push(limit);
    }
    const stmt = db.prepare(query);
    return stmt.all(...params) as { id: string }[];
}
