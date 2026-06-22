import { logger } from '../logger';
import { upsertTranscriptData, getChannelInternalId, getVideosMissingTranscripts } from '../services/db.service';
import { resolveIdentifiers } from '../services/command.service';
import getChannelTranscripts from '../lib/yt-dlp/getChannelTranscripts';
import { YTFetchCommand } from '../types/types';

const fetchTranscripts: YTFetchCommand = {
    command: 'fetch-transcripts <inputs..>',
    describe: 'Fetches transcripts for channels\' videos. Accepts space-separated handles/IDs/URLs or a single .txt/.json file path.',

    builder: (yargs) => {
        return yargs
            .positional('inputs', {
                describe: 'YouTube channel handles, IDs, or URLs (space-separated). If --bulk is used, provide a single file path.',
                type: 'string',
                array: true,
                demandOption: true,
            })
            .option('limit', {
                describe: 'Limit the number of transcripts to fetch per channel',
                type: 'number',
                default: 10,
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
            })
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
            if (!json) logger.info(`Fetching transcripts for channel: ${channelIdentifier} (Limit: ${limit})`);

            try {
                const channelInternalId = getChannelInternalId(channelIdentifier);
                if (!channelInternalId) {
                    logger.error(`Channel "${channelIdentifier}" not found in the database. Please add it first using fetch-channel.`);
                    continue;
                }

                const videosToProcess = getVideosMissingTranscripts(channelInternalId, limit);

                if (videosToProcess.length === 0) {
                    if (!json) logger.info(`No videos found missing transcripts for ${channelIdentifier} within the specified limit.`);
                    continue;
                }

                const videoIds = videosToProcess.map(v => v.id);
                if (!json) logger.info(`Found ${videoIds.length} videos missing transcripts.`);

                const transcripts = await getChannelTranscripts(videoIds);

                if (json) {
                    results.push({ channel: channelIdentifier, transcripts });
                } else {
                    logger.info(`Fetched ${transcripts.length} transcripts.`);
                }

                if (save) {
                    const storedCount = upsertTranscriptData(transcripts);
                    if (!json) logger.info(`Successfully stored ${storedCount} transcripts.`);
                } else if (!json) {
                    logger.info('Transcripts not saved (use --save to store in DB).');
                }

            } catch (error) {
                logger.error(`Error during fetchTranscripts for ${channelIdentifier}:`, error);
            }
        }

        if (json) {
            console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
        }
    },
};

export default fetchTranscripts;
