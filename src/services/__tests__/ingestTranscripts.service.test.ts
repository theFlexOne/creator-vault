import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockGetChannelTranscripts = jest.fn<(videoIds: number[]) => Promise<Array<{ videoId: number; text: string }>>>();
const mockUpsertTranscriptData = jest.fn<(transcripts: Array<{ videoId: number; text: string }>) => number>();
const mockGetChannelInternalId = jest.fn<(identifier: string) => number | undefined>();
const mockGetVideosMissingTranscripts = jest.fn<(channelId: number, limit?: number) => Array<{ id: number }>>();
const mockResolveIdentifiers = jest.fn<(args: string[]) => Promise<string[]>>();

jest.mock('../../shared/logger', () => ({
    logger: {
        info: (...args: unknown[]) => mockLoggerInfo(...args),
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

jest.mock('../../lib/youtube/getChannelTranscripts', () => ({
    __esModule: true,
    default: (videoIds: number[]) => mockGetChannelTranscripts(videoIds),
}));

jest.mock('../../repositories/transcript.repository', () => ({
    upsertTranscriptData: (transcripts: Array<{ videoId: number; text: string }>) =>
        mockUpsertTranscriptData(transcripts),
}));

jest.mock('../../repositories/channel.repository', () => ({
    getChannelInternalId: (identifier: string) => mockGetChannelInternalId(identifier),
}));

jest.mock('../../repositories/video.repository', () => ({
    getVideosMissingTranscripts: (channelId: number, limit?: number) =>
        mockGetVideosMissingTranscripts(channelId, limit),
}));

jest.mock('../command.service', () => ({
    resolveIdentifiers: (args: string[]) => mockResolveIdentifiers(args),
}));

import { runIngestTranscriptsWorkflow } from '../ingestTranscripts.service';

describe('runIngestTranscriptsWorkflow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns structured transcript results and logs normal progress', async () => {
        mockResolveIdentifiers.mockResolvedValue(['@alpha']);
        mockGetChannelInternalId.mockReturnValue(7);
        mockGetVideosMissingTranscripts.mockReturnValue([{ id: 1 }, { id: 2 }]);
        mockGetChannelTranscripts.mockResolvedValue([{ videoId: 1, text: 'a' }, { videoId: 2, text: 'b' }]);

        await expect(runIngestTranscriptsWorkflow(['input'], 2, false)).resolves.toMatchObject({
            kind: 'transcripts',
            inputs: ['input'],
            resolved: ['@alpha'],
            save: false,
            limit: 2,
            channelsProcessed: 1,
            missingChannels: [],
            transcriptsFetched: 2,
            transcriptsStored: 0,
            results: [
                {
                    channel: '@alpha',
                    transcripts: [{ videoId: 1, text: 'a' }, { videoId: 2, text: 'b' }],
                },
            ],
        });

        expect(mockLoggerInfo).toHaveBeenCalledWith('Resolved 1 channels to process.');
        expect(mockLoggerInfo).toHaveBeenCalledWith('Ingesting transcripts for channel: @alpha (Limit: 2)');
        expect(mockLoggerInfo).toHaveBeenCalledWith('Found 2 videos missing transcripts.');
        expect(mockLoggerInfo).toHaveBeenCalledWith('Ingested 2 transcripts.');
        expect(mockLoggerInfo).toHaveBeenCalledWith('Transcripts not saved (use --save to store in DB).');
        expect(mockUpsertTranscriptData).not.toHaveBeenCalled();
    });

    it('saves transcripts when save=true', async () => {
        mockResolveIdentifiers.mockResolvedValue(['@alpha']);
        mockGetChannelInternalId.mockReturnValue(7);
        mockGetVideosMissingTranscripts.mockReturnValue([{ id: 1 }]);
        mockGetChannelTranscripts.mockResolvedValue([{ videoId: 1, text: 'a' }]);
        mockUpsertTranscriptData.mockReturnValue(1);

        await expect(runIngestTranscriptsWorkflow(['input'], 1, true)).resolves.toMatchObject({
            transcriptsFetched: 1,
            transcriptsStored: 1,
            results: [{ channel: '@alpha', transcripts: [{ videoId: 1, text: 'a' }] }],
        });

        expect(mockUpsertTranscriptData).toHaveBeenCalledWith([{ videoId: 1, text: 'a' }]);
        expect(mockLoggerInfo).toHaveBeenCalledWith('Successfully stored 1 transcripts.');
    });

    it('logs an error and skips channels that are missing from the database', async () => {
        mockResolveIdentifiers.mockResolvedValue(['@missing']);
        mockGetChannelInternalId.mockReturnValue(undefined);

        await expect(runIngestTranscriptsWorkflow(['input'], 1, true)).resolves.toMatchObject({
            missingChannels: ['@missing'],
            transcriptsFetched: 0,
            transcriptsStored: 0,
            results: [],
        });

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Channel "@missing" not found in the database. Please add it first using ingest-channel-profile.',
        );
        expect(mockGetVideosMissingTranscripts).not.toHaveBeenCalled();
        expect(mockUpsertTranscriptData).not.toHaveBeenCalled();
    });
});
