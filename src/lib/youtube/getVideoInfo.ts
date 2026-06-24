import youtubedl, { Payload } from 'youtube-dl-exec';
import { VideoDTO } from '../../domain/video/video.types';
import { logger } from '../../shared/logger';

export default async function getVideoInfo(inputs: string[]): Promise<VideoDTO[]> {
    if (inputs.length === 0) {
        return [];
    }

    const results = await Promise.all(
        inputs.map(async (input): Promise<VideoDTO | null> => {
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

    return results.filter((video): video is VideoDTO => video !== null);
}