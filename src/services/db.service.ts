import db from '../db';
// import { VideoTranscript } from '../lib/yt-dlp/getChannelTranscripts';
import { logger } from '../logger';
import { ChannelDTO, VideoDTO } from '../types/types';

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

// const upsertTranscript = db.prepare(`
//     INSERT INTO transcripts (video_id, text)
//     VALUES (?, ?)
//     ON CONFLICT(video_id) DO UPDATE SET
//         text = excluded.text
// `);

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

// export function upsertTranscriptData(transcripts: VideoTranscript[]): number {
//     const insertManyTranscripts = db.transaction((transcriptList: VideoTranscript[]) => {
//         let count = 0;
//         for (const t of transcriptList) {
//             upsertTranscript.run(t.videoId, t.transcript);
//             count++;
//         }
//         return count;
//     });

//     const storedCount = insertManyTranscripts(transcripts);
//     logger.info(`Successfully stored ${storedCount} transcripts.`);
//     return storedCount;
// }

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

export function getVideosMissingTranscripts(channelInternalId: number, limit?: number): { id: number }[] {
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
    return stmt.all(...params) as { id: number }[];
}
