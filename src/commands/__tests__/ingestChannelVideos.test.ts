import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { CommandModule } from 'yargs';
import yargs from 'yargs/yargs';

const mockRunIngestChannelVideos = jest.fn() as jest.MockedFunction<
    (inputs: string[], limit: number, save: boolean, batch: number, createChannel?: boolean) => Promise<void>
>;

jest.mock('../../ingest', () => ({
    runIngestChannelVideos: (...args: unknown[]) => (mockRunIngestChannelVideos as any)(...args),
}));

import ingestChannelVideos from '../ingestChannelVideos';

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

describe('ingestChannelVideos command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates execution to the ingest channel videos runner', async () => {
        await ingestChannelVideos.handler({
            inputs: ['channels.txt'],
            limit: 25,
            save: true,
            batch: 5,
            createChannel: true,
            _: [],
            $0: '',
        } as any);

        expect(mockRunIngestChannelVideos).toHaveBeenCalledWith(['channels.txt'], 25, true, 5, true);
    });

    it('parses defaults for video ingestion', async () => {
        await parseCommand(ingestChannelVideos as CommandModule, ['ingest-channel-videos', '@alpha']);

        expect(mockRunIngestChannelVideos).toHaveBeenCalledWith(['@alpha'], 100, false, 10, false);
    });

    it('parses save, batch, limit, and create-channel options', async () => {
        await parseCommand(ingestChannelVideos as CommandModule, [
            'ingest-channel-videos',
            '@alpha',
            '--limit',
            '25',
            '--batch',
            '5',
            '--save',
            '--create-channel',
        ]);

        expect(mockRunIngestChannelVideos).toHaveBeenCalledWith(['@alpha'], 25, true, 5, true);
    });

    it('rejects non-positive limit and batch values', async () => {
        await expect(parseCommand(ingestChannelVideos as CommandModule, [
            'ingest-channel-videos',
            '@alpha',
            '--limit',
            '0',
        ])).rejects.toThrow('Both --limit and --batch must be greater than 0.');

        await expect(parseCommand(ingestChannelVideos as CommandModule, [
            'ingest-channel-videos',
            '@alpha',
            '--batch',
            '0',
        ])).rejects.toThrow('Both --limit and --batch must be greater than 0.');
    });
});
