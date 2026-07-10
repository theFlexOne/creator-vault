import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CommandModule } from 'yargs';
import yargs from 'yargs/yargs';

const mockRunShowProfile = jest.fn();

jest.mock('../../services/profile.service', () => ({
    runShowProfile: (...args: unknown[]) => (mockRunShowProfile as any)(...args),
}));

import profile from '../profile';

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

describe('profile command', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    beforeEach(() => {
        jest.clearAllMocks();
        mockRunShowProfile.mockReturnValue({ name: 'Alpha' });
    });

    it('parses profile show', async () => {
        await parseCommand(profile as CommandModule, ['profile', 'show', 'Alpha']);

        expect(mockRunShowProfile).toHaveBeenCalledWith('Alpha');
        expect(consoleLogSpy).toHaveBeenCalled();
    });
});