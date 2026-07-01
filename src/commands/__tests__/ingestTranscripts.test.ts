import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { CommandModule } from 'yargs';
import yargs from 'yargs/yargs';

const mockRunIngestTranscripts = jest.fn() as jest.MockedFunction<
    (inputs: string[], limit: number, save: boolean) => Promise<void>
>;

jest.mock('../../ingest', () => ({
    runIngestTranscripts: (...args: unknown[]) => (mockRunIngestTranscripts as any)(...args),
}));

import ingestTranscripts from '../ingestTranscripts';

async function parseCommand(command: CommandModule, args: string[]): Promise<void> {
    await yargs(args)
        .command(command)
        .exitProcess(false)
        .fail((message, error) => {
            throw error ?? new Error(message ?? 'Command parsing failed.');
        })
        .help(false)
        .version(false)
        .parseAsync();
}

describe('ingestTranscripts command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates execution to the ingest transcripts runner', async () => {
        await ingestTranscripts.handler({
            inputs: ['channels.txt'],
            limit: 10,
            save: true,
            _: [],
            $0: '',
        } as any);

        expect(mockRunIngestTranscripts).toHaveBeenCalledWith(['channels.txt'], 10, true);
    });

    it('parses defaults for transcript ingestion', async () => {
        await parseCommand(ingestTranscripts as CommandModule, ['ingest-transcripts', '@alpha']);

        expect(mockRunIngestTranscripts).toHaveBeenCalledWith(['@alpha'], 10, false);
    });

    it('parses limit and save options', async () => {
        await parseCommand(ingestTranscripts as CommandModule, [
            'ingest-transcripts',
            '@alpha',
            '--limit',
            '25',
            '--save',
        ]);

        expect(mockRunIngestTranscripts).toHaveBeenCalledWith(['@alpha'], 25, true);
    });

    it('rejects non-positive limits', async () => {
        await expect(parseCommand(ingestTranscripts as CommandModule, [
            'ingest-transcripts',
            '@alpha',
            '--limit',
            '0',
        ])).rejects.toThrow('--limit must be greater than 0.');
    });
});
