import youtubedl from 'youtube-dl-exec';
import { PayloadWithEntries } from './types';
import { logger } from '../../shared/logger';
import normalizeYoutubeUrl from './normalizeYoutubeUrl';

export default async function getChannelVideoUrls(input: string, start: number | null = null, limit: number | null = null): Promise<string[]> {
    const url = `${normalizeYoutubeUrl(input)}/videos`;
    try {
        const output = await youtubedl(url, {
            flatPlaylist: true,
            skipDownload: true,
            dumpSingleJson: true,
            playlistStart: start ?? undefined,
            playlistEnd: limit ?? undefined,
        }) as PayloadWithEntries;

        if (!output.entries || output.entries.length === 0) {
            logger.warn(`No video entries found for channel: ${url}`);
            return [];
        }

        const videoUrls = output.entries.reduce<string[]>((urls, entry, _, entries) => {
            if (entry._type === 'url' && entry.url) {
                urls.push(entry.url);
            } else if (entry._type === 'playlist' && entry.entries) {
                entries.push(...entry.entries);
            }
            return urls;
        }, []);

        return videoUrls;
    }
    catch (error) {
        logger.error('Error fetching video URLs via YouTube wrapper:', error);
        return [];
    }
}