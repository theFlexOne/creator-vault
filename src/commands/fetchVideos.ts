import { CommandModule } from 'yargs';
import { runFetchVideos } from '../services/fetchVideos.service';

const fetchVideos: CommandModule<{}, { inputs: string[]; limit: number; save: boolean; batch: number }> = {
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
        await runFetchVideos(inputs, limit, save, batch);
    }
};

export default fetchVideos;
