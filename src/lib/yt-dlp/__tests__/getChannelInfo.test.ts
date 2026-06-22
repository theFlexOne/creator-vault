import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockNormalizeYoutubeUrl = jest.fn() as jest.MockedFunction<(input: string) => string>;
const mockYoutubeDl = jest.fn() as jest.MockedFunction<(
    url: string,
    options: Record<string, unknown>,
) => Promise<unknown>>;
const mockLoggerError = jest.fn();

jest.mock('../../../services/command.service', () => ({
    normalizeYoutubeUrl: (input: string) => mockNormalizeYoutubeUrl(input),
}));

jest.mock('youtube-dl-exec', () => ({
    __esModule: true,
    default: (...args: unknown[]) => (mockYoutubeDl as any)(...args),
}));

jest.mock('../../../logger', () => ({
    logger: {
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

import getChannelInfo from '../getChannelInfo';

describe('getChannelInfo', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('normalizes the input and maps yt-dlp output to ChannelDTO', async () => {
        mockNormalizeYoutubeUrl.mockReturnValue('https://www.youtube.com/@example/videos');
        mockYoutubeDl.mockResolvedValue({
            uploader_id: '@example',
            channel_id: 'UC123',
            channel: 'Example Channel',
            channel_url: 'https://www.youtube.com/@example',
            description: 'Channel description',
            tags: ['tag-one', 'tag-two'],
            channel_follower_count: 42,
        });

        await expect(getChannelInfo('@example')).resolves.toEqual({
            handle: '@example',
            youtubeChannelId: 'UC123',
            name: 'Example Channel',
            url: 'https://www.youtube.com/@example',
            description: 'Channel description',
            tags: ['tag-one', 'tag-two'],
            followers: 42,
        });

        expect(mockNormalizeYoutubeUrl).toHaveBeenCalledWith('@example');
        expect(mockYoutubeDl).toHaveBeenCalledWith('https://www.youtube.com/@example/videos', {
            flatPlaylist: true,
            skipDownload: true,
            dumpSingleJson: true,
            playlistItems: '0',
        });
        expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('logs and returns undefined when yt-dlp fails', async () => {
        mockNormalizeYoutubeUrl.mockReturnValue('https://www.youtube.com/@broken/videos');
        mockYoutubeDl.mockRejectedValue(new Error('yt-dlp failed'));

        await expect(getChannelInfo('@broken')).resolves.toBeUndefined();

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Error fetching via yt-dlp wrapper:',
            expect.any(Error),
        );
    });
});