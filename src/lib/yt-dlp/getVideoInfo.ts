import youtubedl from 'youtube-dl-exec';
import { VideoDTO } from '../../types/types';
import { logger } from '../../logger';

export default async function getVideoInfo(inputs: string[]): Promise<VideoDTO[]> {
    const videoInfoList: VideoDTO[] = [];

    for (const input of inputs) {
        try {
            const output = await youtubedl(input, {
                dumpSingleJson: true,
                skipDownload: true,
            }) as VideoDTO;

            videoInfoList.push(output);
        } catch (error) {
            logger.error(`Error fetching video info for ${input}:`, error);
        }
    }

    return videoInfoList;
}
    