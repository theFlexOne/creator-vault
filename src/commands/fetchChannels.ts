import { CommandModule } from 'yargs';
import { runFetchChannels } from '../services/fetchChannels.service';

type FetchChannelsCommand = CommandModule<{}, {
    inputs: string[];
    save: boolean;
}>;

const fetchChannels: FetchChannelsCommand = {
    command: 'fetch-channels <inputs..>',
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
        await runFetchChannels(inputs, save);
    },
};

export default fetchChannels;
