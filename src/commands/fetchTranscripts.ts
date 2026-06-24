import { CommandModule } from 'yargs';
import { runFetchTranscripts } from '../services/fetchTranscripts.service';

const fetchTranscripts: CommandModule<{}, { inputs: string[]; limit: number; save: boolean; json: boolean }> = {
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
        await runFetchTranscripts(inputs, limit, save, json);
    },
};

export default fetchTranscripts;
