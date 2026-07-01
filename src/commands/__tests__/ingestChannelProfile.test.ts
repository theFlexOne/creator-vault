import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { CommandModule } from 'yargs';
import yargs from 'yargs/yargs';

const mockRunIngestChannelProfile = jest.fn() as jest.MockedFunction<(inputs: string[], save: boolean) => Promise<void>>;

jest.mock('../../ingest', () => ({
    runIngestChannelProfile: (...args: unknown[]) => (mockRunIngestChannelProfile as any)(...args),
}));

import ingestChannelProfile from '../ingestChannelProfile';

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

describe('ingestChannelProfile command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates execution to the ingest channel profile runner', async () => {
        await ingestChannelProfile.handler({ inputs: ['channels.txt'], save: false, _: [], $0: '' } as any);

        expect(mockRunIngestChannelProfile).toHaveBeenCalledWith(['channels.txt'], false);
    });

    it('parses inputs with save disabled by default', async () => {
        await parseCommand(ingestChannelProfile as CommandModule, ['ingest-channel-profile', '@alpha']);

        expect(mockRunIngestChannelProfile).toHaveBeenCalledWith(['@alpha'], false);
    });

    it('parses the save alias', async () => {
        await parseCommand(ingestChannelProfile as CommandModule, ['ingest-channel-profile', '@alpha', '-s']);

        expect(mockRunIngestChannelProfile).toHaveBeenCalledWith(['@alpha'], true);
    });

    it('requires at least one input', async () => {
        await expect(parseCommand(ingestChannelProfile as CommandModule, [
            'ingest-channel-profile',
        ])).rejects.toThrow('Not enough non-option arguments');
    });
});
