import db from '../lib/sqlite/db';
import { logger } from '../shared/logger';
import type { VideoDTO } from '../domain/video/video.types';

const upsertVideo = db.prepare(`
    INSERT INTO videos (
        youtube_video_id,
        channel_id,
        title,
        url,
        description,
        duration,
        upload_date,
        view_count,
        categories,
        tags,
        transcript
    )
    VALUES (
        @youtube_video_id,
        @channel_id,
        COALESCE(@title, ''),
        COALESCE(@url, ''),
        COALESCE(@description, ''),
        COALESCE(@duration, 0),
        @upload_date,
        COALESCE(@view_count, 0),
        COALESCE(@categories, '[]'),
        COALESCE(@tags, '[]'),
        COALESCE(@transcript, '[]')
    )
    ON CONFLICT(youtube_video_id) DO UPDATE SET
        channel_id = COALESCE(@channel_id, videos.channel_id),
        title = COALESCE(@title, videos.title),
        url = COALESCE(@url, videos.url),
        description = COALESCE(@description, videos.description),
        duration = COALESCE(@duration, videos.duration),
        upload_date = COALESCE(@upload_date, videos.upload_date),
        view_count = COALESCE(@view_count, videos.view_count),
        categories = COALESCE(@categories, videos.categories),
        tags = COALESCE(@tags, videos.tags),
        transcript = COALESCE(@transcript, videos.transcript)
    RETURNING id
`);

export function upsertVideoInfo(channelId: number, videos: VideoDTO[]): number {
    if (!videos || videos.length === 0) {
        logger.info('No videos to upsert for channel ID: ' + channelId);
        return 0;
    }

    const insertManyVideos = db.transaction((videoList: VideoDTO[]) => {
        let count = 0;

        for (const video of videoList) {
            if (!video.youtubeVideoId) {
                logger.warn(`Skipping video upsert with missing youtubeVideoId for channel ID: ${channelId}`);
                continue;
            }

            const videoResult = upsertVideo.get({
                youtube_video_id: video.youtubeVideoId,
                channel_id: channelId,
                title: video.title ?? null,
                url: video.url ?? null,
                description: video.description ?? null,
                duration: video.duration ?? null,
                upload_date: video.uploadDate ?? null,
                view_count: video.viewCount ?? null,
                categories: video.categories !== undefined ? JSON.stringify(video.categories) : null,
                tags: video.tags !== undefined ? JSON.stringify(video.tags) : null,
                transcript: video.transcript ?? null,
            }) as { id: number } | undefined;

            if (!videoResult) {
                throw new Error(`Failed to upsert video ${video.youtubeVideoId}`);
            }

            video.id = videoResult.id;
            video.channelId = channelId;
            count += 1;
        }

        return count;
    });

    const insertedCount = insertManyVideos(videos);
    logger.info(`Processed ${videos.length} videos. Actually inserted/updated: ${insertedCount}`);
    return insertedCount;
}

export function getVideosMissingTranscripts(channelInternalId: number, limit?: number): { id: number }[] {
    let query = `
        SELECT id FROM videos 
        WHERE channel_id = ? AND id NOT IN (SELECT DISTINCT video_id FROM transcripts)
    `;
    const params: (string | number)[] = [channelInternalId];

    if (limit) {
        query += ` LIMIT ?`;
        params.push(limit);
    }
    const stmt = db.prepare(query);
    return stmt.all(...params) as { id: number }[];
}
