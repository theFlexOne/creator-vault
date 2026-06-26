import youtubedl from 'youtube-dl-exec';
import { PayloadWithEntries } from './types';
import { logger } from '../../shared/logger';
import normalizeYoutubeUrl from './normalizeYoutubeUrl';
import type { ChannelRecord } from '../../types/ingestion.types';

export default async function getChannelInfo(input: string): Promise<ChannelRecord | undefined> {
    const url = normalizeYoutubeUrl(input);
    try {
        const output = await youtubedl(url, {
            flatPlaylist: true,
            skipDownload: true,
            dumpSingleJson: true,
            playlistItems: '0', // Don't fetch any video metadata, just the channel-level info
        }) as PayloadWithEntries

        const channelDto: ChannelRecord = {
            handle: output.uploader_id,
            youtubeChannelId: output.channel_id,
            name: output.channel,
            url: output.channel_url,
            description: output.description,
            tags: output.tags,
            followers: output.channel_follower_count
        }

        return channelDto;
    } catch (error) {
        logger.error('Error fetching via YouTube wrapper:', error);
        return;
    }
}
