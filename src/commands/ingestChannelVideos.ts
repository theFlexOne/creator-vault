import { CommandModule } from 'yargs';
import { runIngestChannelVideos } from '../ingest';

const ingestChannelVideos: CommandModule<{}, {
    inputs: string[];
    limit: number;
    save: boolean;
    batch: number;
    createChannel: boolean;
}> = {
    command: 'ingest-channel-videos <inputs..>',
    describe: 'Ingests YouTube video metadata using the current video metadata workflow.',

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
                default: 10,
            })
            .option('createChannel', {
                alias: 'create-channel',
                describe: 'Create or reuse a profile-backed YouTube channel when saving videos',
                type: 'boolean',
                default: false,
            })
            .check((args) => {
                if (args.limit < 1 || args.batch < 1) {
                    throw new Error('Both --limit and --batch must be greater than 0.');
                }

                return true;
            });
    },
    handler: async (argv) => {
        const { inputs, limit, save, batch, createChannel } = argv;
        await runIngestChannelVideos(inputs, limit, save, batch, createChannel);
    },
};

export default ingestChannelVideos;
