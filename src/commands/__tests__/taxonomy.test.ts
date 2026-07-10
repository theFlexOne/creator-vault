import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CommandModule } from 'yargs';
import yargs from 'yargs/yargs';

const mockRunCreateTaxonomyTerm = jest.fn();
const mockRunListTaxonomyTerms = jest.fn();
const mockRunAssignProfileTerm = jest.fn();
const mockRunRemoveProfileTerm = jest.fn();

jest.mock('../../services/taxonomy.service', () => ({
    runCreateTaxonomyTerm: (...args: unknown[]) => (mockRunCreateTaxonomyTerm as any)(...args),
    runListTaxonomyTerms: (...args: unknown[]) => (mockRunListTaxonomyTerms as any)(...args),
    runAssignProfileTerm: (...args: unknown[]) => (mockRunAssignProfileTerm as any)(...args),
    runRemoveProfileTerm: (...args: unknown[]) => (mockRunRemoveProfileTerm as any)(...args),
}));

import taxonomy from '../taxonomy';

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

describe('taxonomy command', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    beforeEach(() => {
        jest.clearAllMocks();
        mockRunCreateTaxonomyTerm.mockReturnValue({ slug: 'apologetics' });
        mockRunListTaxonomyTerms.mockReturnValue([]);
        mockRunAssignProfileTerm.mockReturnValue({ profileName: 'Alpha', termSlug: 'apologetics' });
        mockRunRemoveProfileTerm.mockReturnValue({ profileName: 'Alpha', termSlug: 'apologetics', removed: true });
    });

    it('parses taxonomy create-term', async () => {
        await parseCommand(taxonomy as CommandModule, [
            'taxonomy',
            'create-term',
            'apologetics',
            'Apologetics',
            '--description',
            'Primary bucket',
            '--parent',
            'theology',
        ]);

        expect(mockRunCreateTaxonomyTerm).toHaveBeenCalledWith({
            slug: 'apologetics',
            label: 'Apologetics',
            description: 'Primary bucket',
            parentSlug: 'theology',
        });
        expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('parses taxonomy list-terms', async () => {
        await parseCommand(taxonomy as CommandModule, ['taxonomy', 'list-terms']);

        expect(mockRunListTaxonomyTerms).toHaveBeenCalledWith();
        expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('parses taxonomy assign-profile-term', async () => {
        await parseCommand(taxonomy as CommandModule, ['taxonomy', 'assign-profile-term', 'Alpha', 'apologetics']);

        expect(mockRunAssignProfileTerm).toHaveBeenCalledWith('Alpha', 'apologetics');
        expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('parses taxonomy remove-profile-term', async () => {
        await parseCommand(taxonomy as CommandModule, ['taxonomy', 'remove-profile-term', 'Alpha', 'apologetics']);

        expect(mockRunRemoveProfileTerm).toHaveBeenCalledWith('Alpha', 'apologetics');
        expect(consoleLogSpy).toHaveBeenCalled();
    });
});