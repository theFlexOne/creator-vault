import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockGetChannelInfo = jest.fn<(input: string) => Promise<unknown>>();
const mockUpsertChannelInfo = jest.fn<(channel: unknown) => unknown>();
const mockResolveIdentifiers = jest.fn<(args: string[]) => Promise<string[]>>();

jest.mock('../../shared/logger', () => ({
    logger: {
        info: (...args: unknown[]) => mockLoggerInfo(...args),
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

jest.mock('../../lib/youtube/getChannelInfo', () => ({
    __esModule: true,
    default: (input: string) => mockGetChannelInfo(input),
}));

jest.mock('../../repositories/channel.repository', () => ({
    upsertChannelInfo: (channel: unknown) => mockUpsertChannelInfo(channel),
}));

jest.mock('../command.service', () => ({
    resolveIdentifiers: (args: string[]) => mockResolveIdentifiers(args),
}));

import { runIngestChannelProfileWorkflow } from '../ingestChannelProfile.service';

describe('runIngestChannelProfileWorkflow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('saves ingested channels when save=true', async () => {
        mockResolveIdentifiers.mockResolvedValue(['@alpha']);
        mockGetChannelInfo.mockResolvedValue({
            handle: '@alpha',
            name: 'Alpha',
            url: 'https://youtube.com/@alpha',
        });

        await runIngestChannelProfileWorkflow(['input'], true);

        expect(mockResolveIdentifiers).toHaveBeenCalledWith(['input']);
        expect(mockGetChannelInfo).toHaveBeenCalledWith('@alpha');
        expect(mockUpsertChannelInfo).toHaveBeenCalledWith({
            handle: '@alpha',
            name: 'Alpha',
            url: 'https://youtube.com/@alpha',
        });
        expect(mockLoggerInfo).toHaveBeenCalledWith('Ingesting channel profile for: @alpha');
    });

    it('logs JSON output and does not save when save=false', async () => {
        mockResolveIdentifiers.mockResolvedValue(['@alpha']);
        mockGetChannelInfo.mockResolvedValue({
            handle: '@alpha',
            name: 'Alpha',
            url: 'https://youtube.com/@alpha',
        });

        await runIngestChannelProfileWorkflow(['input'], false);

        expect(mockUpsertChannelInfo).not.toHaveBeenCalled();
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            JSON.stringify(
                {
                    handle: '@alpha',
                    name: 'Alpha',
                    url: 'https://youtube.com/@alpha',
                },
                null,
                2,
            ),
        );
        expect(mockLoggerInfo).toHaveBeenCalledWith('Channel not saved (use --save to store in DB).');
    });

    it('logs a failure and continues when channel info is missing', async () => {
        mockResolveIdentifiers.mockResolvedValue(['@broken']);
        mockGetChannelInfo.mockResolvedValue(undefined);

        await runIngestChannelProfileWorkflow(['input'], true);

        expect(mockUpsertChannelInfo).not.toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith('Failed to ingest channel profile for @broken.');
    });
});
