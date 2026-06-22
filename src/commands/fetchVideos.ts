import { logger } from '../logger';
import getChannelInfo from '../lib/yt-dlp/getChannelInfo';
import { upsertVideoData, getChannelInternalId, getChannelUrl } from '../services/db.service';
import { resolveIdentifiers } from '../services/command.service';
import { YTFetchCommand } from '../types/types';

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
                default: 50,
            })
            .option('save', {
                alias: 's',
                describe: 'Save to DB',
                type: 'boolean',
                default: false,
            })
            .option('json', {
                alias: 'j',
                describe: 'Output raw JSON to stdout',
                type: 'boolean',
                default: false,
            });
    },
    handler: async (argv) => {
        const { inputs, limit, save, json } = argv;
        const channels = await resolveIdentifiers(inputs);

        if (json) {
            process.stderr.write(`Resolved ${channels.length} channels to process.\n`);
        } else {
            logger.info(`Resolved ${channels.length} channels to process.`);
        }

        const results = [];

        for (const channelIdentifier of channels) {
            if (!json) logger.info(`Fetching video metadata for channel: ${channelIdentifier} (Limit: ${limit})`);

            try {
                const channelInternalId = getChannelInternalId(channelIdentifier);
                const channelUrl = getChannelUrl(channelIdentifier);

                if (!channelInternalId || !channelUrl) {
                    logger.error(`Channel "${channelIdentifier}" not found in the database. Please add it first using fetch-channels.`);
                    continue;
                }

                const metadata = await getChannelInfo(channelUrl, { quiet: json }); 
                if (!metadata) {
                    logger.error(`Failed to fetch metadata for channel: ${channelIdentifier} from URL: ${channelUrl}.`);
                    continue;
                }

                const videosToProcess = metadata.videos.slice(0, limit);

                if (json) {
                    results.push({ channel: channelIdentifier, videos: videosToProcess });
                } else {
                    logger.info(`Fetched ${videosToProcess.length} videos for ${metadata.title}.`);
                }

                if (save) {
                    const insertedCount = upsertVideoData(channelInternalId, videosToProcess);
                    if (!json) logger.info(`Successfully saved/updated ${insertedCount} videos.`);
                } else if (!json) {
                    logger.info('Video data not saved (use --save to store in DB).');
                }

            } catch (error) {
                logger.error(`Error during fetchVideos for ${channelIdentifier}:`, error);
            }
        }

        if (json) {
            console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
        }
    },
};

export default fetchVideos;
