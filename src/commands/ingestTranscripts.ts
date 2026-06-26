import { CommandModule } from 'yargs';
import { runIngestTranscripts } from '../ingest';

const ingestTranscripts: CommandModule<{}, { inputs: string[]; limit: number; save: boolean }> = {
    command: 'ingest-transcripts <inputs..>',
    describe: 'Ingests transcripts for channel videos using the current transcript workflow.',

    builder: (yargs) => {
        return yargs
            .positional('inputs', {
                describe: 'YouTube channel handles, IDs, or URLs, or a single .txt/.json file path',
                type: 'string',
                array: true,
                demandOption: true,
            })
            .option('limit', {
                describe: 'Limit the number of transcripts to ingest per channel',
                type: 'number',
                default: 10,
            })
            .option('save', {
                alias: 's',
                describe: 'Save to DB',
                type: 'boolean',
                default: false,
            });
    },
    handler: async (argv) => {
        const { inputs, limit, save } = argv;
        await runIngestTranscripts(inputs, limit, save);
    },
};

export default ingestTranscripts;
