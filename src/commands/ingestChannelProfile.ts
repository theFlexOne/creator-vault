import { CommandModule } from 'yargs';
import { runIngestChannelProfile } from '../ingest';

type IngestChannelProfileCommand = CommandModule<{}, {
    inputs: string[];
    save: boolean;
}>;

const ingestChannelProfile: IngestChannelProfileCommand = {
    command: 'ingest-channel-profile <inputs..>',
    describe: 'Ingests YouTube channel profile data using the current channel profile workflow.',

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
        await runIngestChannelProfile(inputs, save);
    },
};

export default ingestChannelProfile;
