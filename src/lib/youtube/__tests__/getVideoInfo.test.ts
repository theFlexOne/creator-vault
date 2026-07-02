import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockYoutubeDl = jest.fn() as jest.MockedFunction<(
    url: string,
    options: Record<string, unknown>,
) => Promise<unknown>>;
const mockLoggerError = jest.fn();

jest.mock('youtube-dl-exec', () => ({
    __esModule: true,
    default: (...args: unknown[]) => (mockYoutubeDl as any)(...args),
}));

jest.mock('../../../shared/logger', () => ({
    logger: {
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

import getVideoInfo from '../getVideoInfo';

describe('getVideoInfo', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns an empty array without invoking youtube-dl when no inputs are provided', async () => {
        await expect(getVideoInfo([])).resolves.toEqual([]);

        expect(mockYoutubeDl).not.toHaveBeenCalled();
    });

    it('maps YouTube metadata into video records', async () => {
        mockYoutubeDl.mockResolvedValue({
            id: 'vid-1',
            title: 'Video One',
            description: 'Description',
            webpage_url: 'https://www.youtube.com/watch?v=vid-1',
            categories: ['Education'],
            tags: ['tag-a'],
            duration: 120,
            upload_date: '20250101',
            view_count: 100,
        });

        await expect(getVideoInfo(['https://www.youtube.com/watch?v=vid-1'])).resolves.toEqual([
            {
                youtubeVideoId: 'vid-1',
                title: 'Video One',
                description: 'Description',
                url: 'https://www.youtube.com/watch?v=vid-1',
                categories: ['Education'],
                tags: ['tag-a'],
                duration: 120,
                uploadDate: '20250101',
                viewCount: 100,
            },
        ]);

        expect(mockYoutubeDl).toHaveBeenCalledWith('https://www.youtube.com/watch?v=vid-1', {
            dumpSingleJson: true,
            skipDownload: true,
        });
    });

    it('filters failed video lookups and logs the error', async () => {
        mockYoutubeDl
            .mockResolvedValueOnce({
                id: 'vid-1',
                title: 'Video One',
                webpage_url: 'https://www.youtube.com/watch?v=vid-1',
            })
            .mockRejectedValueOnce(new Error('video failed'));

        await expect(
            getVideoInfo([
                'https://www.youtube.com/watch?v=vid-1',
                'https://www.youtube.com/watch?v=vid-2',
            ]),
        ).resolves.toEqual([
            {
                youtubeVideoId: 'vid-1',
                title: 'Video One',
                description: undefined,
                url: 'https://www.youtube.com/watch?v=vid-1',
                categories: undefined,
                tags: undefined,
                duration: undefined,
                uploadDate: undefined,
                viewCount: undefined,
            },
        ]);

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Error fetching video info for https://www.youtube.com/watch?v=vid-2:',
            expect.any(Error),
        );
    });
});
