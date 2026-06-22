import { CommandModule } from 'yargs';
import getChannelInfo from '../lib/yt-dlp/getChannelInfo';
import { upsertChannelData } from '../services/db.service';
import { resolveIdentifiers } from '../services/command.service';
import { logger } from '../logger';

type FetchChannelsCommand = CommandModule<{}, {
    inputs: string[];
    save: boolean;
}>;

const fetchChannels: FetchChannelsCommand = {
    command: 'fetch-channel <inputs..>',
    describe: 'Fetches channel info. Accepts space-separated URLs, handles, or IDs, or a single .txt/.json file path.',

    builder: (yargs) => {
        return yargs
            .positional('inputs', {
                describe: 'YouTube URLs, handles, IDs, or path to a file',
                type: 'string',
                array: true,
                demandOption: true,
            })
            .option('save', {
                alias: 's',
                describe: 'Save to DB',
                type: 'boolean',
                default: false,
            });
    },
    handler: async (argv) => {
        const { inputs, save } = argv;
        const urls = await resolveIdentifiers(inputs);

        const results = [];

        for (const url of urls) {
            logger.info(`Fetching channel info for: ${url}`);

            try {
                const channelInfo = await getChannelInfo(url);
                if (!channelInfo) {
                    logger.error(`Failed to fetch channel info for ${url}.`);
                    continue;
                }

                results.push(channelInfo);

                if (save) {
                    upsertChannelData(channelInfo);
                } else {
                    logger.info('Channel not saved (use --save to store in DB).');
                }

            } catch (error) {
                logger.error(`Error during fetchChannel for ${url}:`, error);
            }
        }
    },
};

export default fetchChannels;
