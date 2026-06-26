import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockGetChannelInfo = jest.fn<(input: string) => Promise<unknown>>();
const mockGetChannelVideoUrls = jest.fn<(input: string, start: number | null, limit: number | null) => Promise<string[]>>();
const mockGetVideoInfo = jest.fn<(inputs: string[]) => Promise<unknown[]>>();
const mockUpsertVideoInfo = jest.fn<(channelId: number, videos: unknown[]) => number>();
const mockGetChannelInternalId = jest.fn<(identifier: string) => number | undefined>();
const mockResolveIdentifiers = jest.fn<(args: string[]) => Promise<string[]>>();

jest.mock('../../shared/logger', () => ({
    logger: {
        info: (...args: unknown[]) => mockLoggerInfo(...args),
        warn: (...args: unknown[]) => mockLoggerWarn(...args),
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

jest.mock('../../lib/youtube/getChannelInfo', () => ({
    __esModule: true,
    default: (input: string) => mockGetChannelInfo(input),
}));

jest.mock('../../lib/youtube/getChannelVideoUrls', () => ({
    __esModule: true,
    default: (input: string, start: number | null, limit: number | null) =>
        mockGetChannelVideoUrls(input, start, limit),
}));

jest.mock('../../lib/youtube/getVideoInfo', () => ({
    __esModule: true,
    default: (inputs: string[]) => mockGetVideoInfo(inputs),
}));

jest.mock('../../repositories/video.repository', () => ({
    upsertVideoInfo: (channelId: number, videos: unknown[]) => mockUpsertVideoInfo(channelId, videos),
}));

jest.mock('../../repositories/channel.repository', () => ({
    getChannelInternalId: (identifier: string) => mockGetChannelInternalId(identifier),
}));

jest.mock('../command.service', () => ({
    resolveIdentifiers: (args: string[]) => mockResolveIdentifiers(args),
}));

import { runIngestChannelVideosWorkflow } from '../ingestChannelVideos.service';

describe('runIngestChannelVideosWorkflow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('warns and returns when no valid identifiers are resolved', async () => {
        mockResolveIdentifiers.mockResolvedValue([]);

        await expect(runIngestChannelVideosWorkflow(['input'], 10, false, 5)).resolves.toMatchObject({
            kind: 'videos',
            inputs: ['input'],
            resolved: [],
            save: false,
            limit: 10,
            batchSize: 5,
            channelsTotal: 0,
            channelsSucceeded: 0,
            channelsFailed: 0,
            batchesFailed: 0,
            videosUpserted: 0,
            channelReports: [],
        });

        expect(mockLoggerWarn).toHaveBeenCalledWith('No valid channel identifiers were provided.');
        expect(mockGetChannelInfo).not.toHaveBeenCalled();
    });

    it('saves video batches and reports the final summary when save=true', async () => {
        mockResolveIdentifiers.mockResolvedValue(['@alpha']);
        mockGetChannelInfo.mockResolvedValue({ youtubeChannelId: 'UC123', handle: '@alpha' });
        mockGetChannelInternalId.mockReturnValue(42);
        mockGetChannelVideoUrls.mockResolvedValue(['v1', 'v2']);
        mockGetVideoInfo.mockResolvedValue([{ youtubeVideoId: 'vid-1' }, { youtubeVideoId: 'vid-2' }]);
        mockUpsertVideoInfo.mockReturnValue(2);

        await expect(runIngestChannelVideosWorkflow(['input'], 2, true, 10)).resolves.toMatchObject({
            kind: 'videos',
            inputs: ['input'],
            resolved: ['@alpha'],
            save: true,
            limit: 2,
            batchSize: 10,
            channelsTotal: 1,
            channelsSucceeded: 1,
            channelsFailed: 0,
            batchesFailed: 0,
            videosUpserted: 2,
            channelReports: [
                {
                    identifier: '@alpha',
                    videoUrlsDiscovered: 2,
                    videosFetched: 2,
                    videosUpserted: 2,
                    batchFailures: 0,
                    failed: false,
                },
            ],
        });

        expect(mockGetChannelVideoUrls).toHaveBeenCalledWith('@alpha', 1, 2);
        expect(mockGetVideoInfo).toHaveBeenCalledWith(['v1', 'v2']);
        expect(mockUpsertVideoInfo).toHaveBeenCalledWith(42, [{ youtubeVideoId: 'vid-1' }, { youtubeVideoId: 'vid-2' }]);
        expect(mockLoggerInfo).toHaveBeenCalledWith('Finished processing 2 videos for channel: @alpha');
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'Done. channels=1, succeeded=1, failed=0, batchFailures=0, upserted=2',
        );
    });

    it('accumulates batch failures and throws after processing finishes', async () => {
        mockResolveIdentifiers.mockResolvedValue(['@alpha']);
        mockGetChannelInfo.mockResolvedValue({ youtubeChannelId: 'UC123', handle: '@alpha' });
        mockGetChannelInternalId.mockReturnValue(42);
        mockGetChannelVideoUrls.mockResolvedValue(['v1']);
        mockGetVideoInfo.mockRejectedValue(new Error('batch exploded'));

        await expect(runIngestChannelVideosWorkflow(['input'], 1, true, 1)).rejects.toThrow(
            'Completed with failures: channelsFailed=0, batchFailures=1',
        );

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Batch failed for channel @alpha at offset 0: batch exploded',
        );
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            'Done. channels=1, succeeded=1, failed=0, batchFailures=1, upserted=0',
        );
    });
});
