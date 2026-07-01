import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CommandModule } from 'yargs';
import yargs from 'yargs/yargs';

const mockRunTestConnection = jest.fn() as jest.MockedFunction<() => Promise<void>>;

jest.mock('../../services/testConnection.service', () => ({
    runTestConnection: () => mockRunTestConnection(),
}));

import testConnection from '../testConnection';

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

describe('testConnection command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates execution to the diagnostic service', async () => {
        await testConnection.handler({ _: [], $0: '' });

        expect(mockRunTestConnection).toHaveBeenCalledTimes(1);
    });

    it('parses the test-connection command', async () => {
        await parseCommand(testConnection as CommandModule, ['test-connection']);

        expect(mockRunTestConnection).toHaveBeenCalledTimes(1);
    });
});
