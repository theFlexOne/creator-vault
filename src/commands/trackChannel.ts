import { CommandModule } from 'yargs';
import { logger } from '../logger';
import getChannelInfo from '../lib/yt-dlp/getChannelInfo';
import getChannelTranscripts from '../lib/yt-dlp/getChannelTranscripts';
import { upsertChannelData, upsertVideoData, upsertTranscriptData, getVideosMissingTranscripts } from '../services/db.service';
import { resolveIdentifiers } from '../services/command.service';

const trackChannel: CommandModule<{}, { urls: string[]; limit: number }> = {
    command: 'track-channel <urls..>',
    describe: 'Fetch and store channel metadata, videos, and transcripts. Accepts space-separated URLs, handles, or IDs, or a single .txt/.json file path.',

    builder: (yargs) => {
        return yargs
            .positional('urls', {
                describe: 'YouTube channel URLs, handles, IDs, or path to a file',
                type: 'string',
                array: true,
                demandOption: true,
            })
            .option('limit', {
                describe: 'Limit the number of videos to process per channel',
                type: 'number',
                default: 5,
            });
    },
    handler: async (argv) => {
        const { urls: inputs, limit } = argv;
        const urls = await resolveIdentifiers(inputs);

        logger.info(`Resolved ${urls.length} channels to track.`);

        for (const url of urls) {
            logger.info(`Tracking channel: ${url} (Limit: ${limit})`);

            try {
                const metadata = await getChannelInfo(url);
                if (!metadata) {
                    logger.error(`Failed to fetch channel metadata for ${url}.`);
                    continue;
                }

                const { videos: allVideos } = metadata;

                // Apply limit
                const videos = allVideos.slice(0, limit);
                logger.info(`Processing ${videos.length} out of ${allVideos.length} found videos.`);

                // 1. Upsert channel
                const channelInternalId = upsertChannelData(metadata);

                // 2. Upsert videos
                upsertVideoData(channelInternalId, videos);

                // 3. Fetch and store transcripts for videos that don't have them
                const missingTranscripts = getVideosMissingTranscripts(channelInternalId, limit);

                if (missingTranscripts.length > 0) {
                    logger.info(`Fetching transcripts for ${missingTranscripts.length} videos...`);
                    const videoIds = missingTranscripts.map(v => v.id);
                    const transcripts = await getChannelTranscripts(videoIds);

                    upsertTranscriptData(transcripts);
                } else {
                    logger.info('All processed videos already have transcripts.');
                }

                logger.info(`Channel tracking complete for ${url}.`);
            } catch (error) {
                logger.error(`Error during channel tracking for ${url}:`, error);
            }
        }
    },
};

export default trackChannel;
