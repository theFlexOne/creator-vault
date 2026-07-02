import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockNormalizeYoutubeUrl = jest.fn() as jest.MockedFunction<(input: string) => string>;
const mockYoutubeDl = jest.fn() as jest.MockedFunction<(
    url: string,
    options: Record<string, unknown>,
) => Promise<unknown>>;
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../normalizeYoutubeUrl', () => ({
    __esModule: true,
    default: (input: string) => mockNormalizeYoutubeUrl(input),
}));

jest.mock('youtube-dl-exec', () => ({
    __esModule: true,
    default: (...args: unknown[]) => (mockYoutubeDl as any)(...args),
}));

jest.mock('../../../shared/logger', () => ({
    logger: {
        warn: (...args: unknown[]) => mockLoggerWarn(...args),
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

import getChannelVideoUrls from '../getChannelVideoUrls';

describe('getChannelVideoUrls', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('normalizes the input and returns direct playlist URL entries', async () => {
        mockNormalizeYoutubeUrl.mockReturnValue('https://www.youtube.com/@alpha');
        mockYoutubeDl.mockResolvedValue({
            entries: [
                { _type: 'url', url: 'https://www.youtube.com/watch?v=vid-1' },
                { _type: 'url', url: 'https://www.youtube.com/watch?v=vid-2' },
            ],
        });

        await expect(getChannelVideoUrls('@alpha', 2, 4)).resolves.toEqual([
            'https://www.youtube.com/watch?v=vid-1',
            'https://www.youtube.com/watch?v=vid-2',
        ]);

        expect(mockYoutubeDl).toHaveBeenCalledWith('https://www.youtube.com/@alpha/videos', {
            flatPlaylist: true,
            skipDownload: true,
            dumpSingleJson: true,
            playlistStart: 2,
            playlistEnd: 4,
        });
        expect(mockLoggerWarn).not.toHaveBeenCalled();
        expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('warns and returns an empty array when no playlist entries are found', async () => {
        mockNormalizeYoutubeUrl.mockReturnValue('https://www.youtube.com/@alpha');
        mockYoutubeDl.mockResolvedValue({ entries: [] });

        await expect(getChannelVideoUrls('@alpha')).resolves.toEqual([]);

        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'No video entries found for channel: https://www.youtube.com/@alpha/videos',
        );
    });

    it('ignores nested playlist entries in the current compatibility behavior', async () => {
        mockNormalizeYoutubeUrl.mockReturnValue('https://www.youtube.com/@alpha');
        mockYoutubeDl.mockResolvedValue({
            entries: [
                {
                    _type: 'playlist',
                    entries: [
                        { _type: 'url', url: 'https://www.youtube.com/watch?v=vid-2' },
                    ],
                },
            ],
        });

        await expect(getChannelVideoUrls('@alpha')).resolves.toEqual([]);
    });

    it('logs and returns an empty array when the fetch fails', async () => {
        mockNormalizeYoutubeUrl.mockReturnValue('https://www.youtube.com/@alpha');
        mockYoutubeDl.mockRejectedValue(new Error('playlist failed'));

        await expect(getChannelVideoUrls('@alpha')).resolves.toEqual([]);

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Error fetching video URLs via YouTube wrapper:',
            expect.any(Error),
        );
    });
});
