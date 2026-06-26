import youtubedl, { Payload } from 'youtube-dl-exec';
import { logger } from '../../shared/logger';
import type { VideoRecord } from '../../types/ingestion.types';

export default async function getVideoInfo(inputs: string[]): Promise<VideoRecord[]> {
    if (inputs.length === 0) {
        return [];
    }

    const results = await Promise.all(
        inputs.map(async (input): Promise<VideoRecord | null> => {
            try {
                const output = await youtubedl(input, {
                    dumpSingleJson: true,
                    skipDownload: true,
                }) as Payload;

                return {
                    title: output.title,
                    description: output.description,
                    url: output.webpage_url,
                    categories: output.categories,
                    tags: output.tags,
                    duration: output.duration,
                    uploadDate: output.upload_date,
                    viewCount: output.view_count,
                    youtubeVideoId: output.id,
                };
            } catch (error) {
                logger.error(`Error fetching video info for ${input}:`, error);
                return null;
            }
        }),
    );

    return results.filter((video): video is VideoRecord => video !== null);
}
