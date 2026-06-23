import { logger } from '../logger';
import getChannelInfo from '../lib/yt-dlp/getChannelInfo';
import getChannelVideoUrls from '../lib/yt-dlp/getChannelVideoUrls';
import { upsertVideoInfo, getChannelInternalId } from '../services/db.service';
import { resolveIdentifiers } from '../services/command.service';
import { YTFetchCommand } from '../types/types';
import getVideoInfo from '../lib/yt-dlp/getVideoInfo';

const fetchVideos: YTFetchCommand = {
    command: 'fetch-videos <inputs..>',
    describe: 'Fetches video metadata for channels. Accepts space-separated handles/IDs/URLs or a single .txt/.json file path.',

    builder: (yargs) => {
        return yargs
            .positional('inputs', {
                describe: 'YouTube channel handles, IDs, or path to a file',
                type: 'string',
                array: true,
                demandOption: true,
            })
            .option('limit', {
                describe: 'Limit the number of videos to process per channel',
                type: 'number',
                default: 100,
            })
            .option('save', {
                alias: 's',
                describe: 'Save to DB',
                type: 'boolean',
                default: false,
            })
            .option('batch', {
                describe: 'Batch size for processing videos',
                type: 'number',
                default: 20,
            })
            .check((args) => {
                if (args.limit < 1 || args.batch < 1) {
                    throw new Error('Both --limit and --batch must be greater than 0.');
                }

                return true;
            });
    },
    handler: async (argv) => {
        const { inputs, limit, save, batch } = argv;

        const identifiers = await resolveIdentifiers(inputs);

        for (const identifier of identifiers) {
            logger.info(`Processing channel: ${identifier}`);
            const channelInfo = await getChannelInfo(identifier);
            if (!channelInfo) {
                logger.warn(`Failed to fetch channel info for: ${identifier}`);
                continue;
            }

            let channelId: number | undefined;
            if (save) {
                const youtubeChannelId = channelInfo.youtubeChannelId;
                const channelHandle = channelInfo.handle;

                if (!youtubeChannelId && !channelHandle) {
                    logger.warn(`Channel has no youtubeChannelId or handle. Skipping save for: ${identifier}`);
                    continue;
                }

                channelId = youtubeChannelId ? getChannelInternalId(youtubeChannelId) : undefined;
                if (!channelId && channelHandle) {
                    channelId = getChannelInternalId(channelHandle);
                }

                if (!channelId) {
                    logger.warn(`Channel not found in DB: ${identifier}. Skipping.`);
                    continue;
                }
            }

            const videoUrls = await getChannelVideoUrls(identifier);
            const totalToProcess = Math.min(limit, videoUrls.length);
            if (totalToProcess === 0) {
                logger.info(`No videos to process for channel: ${identifier}`);
                continue;
            }

            let counter = 0;
            while (counter < totalToProcess) {
                const batchSize = Math.min(batch, totalToProcess - counter);
                const limitedVideoUrls = videoUrls.slice(counter, counter + batchSize);

                const videoInfoList = await getVideoInfo(limitedVideoUrls);

                if (save && channelId) {
                    const upsertedCount = upsertVideoInfo(channelId, videoInfoList);
                    logger.info(`Upserted ${upsertedCount} videos for channel: ${identifier} (batch starting at ${counter})`);
                }

                counter += batchSize;
            }

            logger.info(`Finished processing ${counter} videos for channel: ${identifier}`);
        }
    }
};

export default fetchVideos;
