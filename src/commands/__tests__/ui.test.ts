import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CommandModule } from 'yargs';
import yargs from 'yargs/yargs';

const mockRunUiShell = jest.fn() as jest.MockedFunction<() => Promise<void>>;

jest.mock('../../ui/shell', () => ({
    runUiShell: () => mockRunUiShell(),
}));

import ui from '../ui';

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

describe('ui command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates execution to the interactive shell', async () => {
        await ui.handler({ _: [], $0: '' });

        expect(mockRunUiShell).toHaveBeenCalledTimes(1);
    });

    it('parses the ui command', async () => {
        await parseCommand(ui as CommandModule, ['ui']);

        expect(mockRunUiShell).toHaveBeenCalledTimes(1);
    });
});
