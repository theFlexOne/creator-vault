import youtubedl from 'youtube-dl-exec';
import { PayloadWithEntries } from '../../types/youtube-dl';
import { logger } from '../../logger';
import { normalizeYoutubeUrl } from '../../services/command.service';
import { ChannelDTO } from '../../types/types';

export default async function getChannelInfo(input: string): Promise<ChannelDTO | undefined> {
    const url = normalizeYoutubeUrl(input);
    try {
        const output = await youtubedl(url, {
            flatPlaylist: true,
            skipDownload: true,
            dumpSingleJson: true,
            playlistItems: '0', // Don't fetch any video metadata, just the channel-level info
        }) as PayloadWithEntries

        const channelDto: ChannelDTO = {
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
        logger.error('Error fetching via yt-dlp wrapper:', error);
        return;
    }
}