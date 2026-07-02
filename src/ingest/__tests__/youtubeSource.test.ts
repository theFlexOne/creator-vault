import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockYoutubeDl = jest.fn() as jest.MockedFunction<(
    url: string,
    options: Record<string, unknown>,
) => Promise<unknown>>;
const mockWriteFile = jest.fn() as jest.MockedFunction<(path: string, data: Uint8Array) => Promise<void>>;

jest.mock('youtube-dl-exec', () => ({
    __esModule: true,
    default: (...args: unknown[]) => (mockYoutubeDl as any)(...args),
}));

jest.mock('fs/promises', () => ({
    writeFile: (path: string, data: Uint8Array) => mockWriteFile(path, data),
}));

import { createProductionYoutubeSource } from '../youtubeSource';

describe('createProductionYoutubeSource', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn() as typeof fetch;
    });

    it('fetches channel profile metadata without enumerating videos', async () => {
        mockYoutubeDl.mockResolvedValue({
            uploader_id: '@alpha',
            channel_id: 'UC123',
            channel: 'Alpha Channel',
            channel_url: 'https://www.youtube.com/channel/UC123',
            description: 'Channel description',
            tags: ['apologetics', 'teaching'],
            channel_follower_count: 42,
        });

        await expect(createProductionYoutubeSource().fetchChannelProfile('@alpha')).resolves.toEqual({
            handle: '@alpha',
            youtubeChannelId: 'UC123',
            name: 'Alpha Channel',
            url: 'https://www.youtube.com/channel/UC123',
            description: 'Channel description',
            tags: ['apologetics', 'teaching'],
            followers: 42,
        });

        expect(mockYoutubeDl).toHaveBeenCalledWith('https://www.youtube.com/@alpha', {
            dumpSingleJson: true,
            skipDownload: true,
            flatPlaylist: true,
            playlistItems: '0',
        });
    });

    it('fetches full channel video metadata with playlist page ranges', async () => {
        mockYoutubeDl.mockResolvedValue({
            entries: [
                {
                    id: 'vid-1',
                    title: 'Video One',
                    webpage_url: 'https://www.youtube.com/watch?v=vid-1',
                    description: 'First video',
                    duration: 120,
                    upload_date: '20250101',
                    view_count: 1000,
                    categories: ['Education'],
                    tags: ['tag-a'],
                },
                {
                    id: 'vid-2',
                    title: 'Video Two',
                    url: 'https://www.youtube.com/watch?v=vid-2',
                },
            ],
        });

        await expect(
            createProductionYoutubeSource().fetchChannelVideosPage('@alpha', { playlistStart: 1, playlistEnd: 10 }),
        ).resolves.toEqual({
            channelInput: '@alpha',
            pageRange: { playlistStart: 1, playlistEnd: 10 },
            videos: [
                {
                    youtubeVideoId: 'vid-1',
                    title: 'Video One',
                    url: 'https://www.youtube.com/watch?v=vid-1',
                    description: 'First video',
                    duration: 120,
                    uploadDate: '20250101',
                    viewCount: 1000,
                    categories: ['Education'],
                    tags: ['tag-a'],
                },
                {
                    youtubeVideoId: 'vid-2',
                    title: 'Video Two',
                    url: 'https://www.youtube.com/watch?v=vid-2',
                },
            ],
        });

        expect(mockYoutubeDl).toHaveBeenCalledWith('https://www.youtube.com/@alpha/videos', {
            dumpSingleJson: true,
            skipDownload: true,
            flatPlaylist: false,
            playlistStart: 1,
            playlistEnd: 10,
        });
    });

    it('skips channel video entries that do not include a YouTube video id', async () => {
        mockYoutubeDl.mockResolvedValue({
            entries: [
                {
                    title: 'Missing id',
                    webpage_url: 'https://www.youtube.com/watch?v=missing',
                },
                {
                    id: 'vid-2',
                    title: 'Video Two',
                    url: 'https://www.youtube.com/watch?v=vid-2',
                },
            ],
        });

        await expect(
            createProductionYoutubeSource().fetchChannelVideosPage('@alpha', { playlistStart: 1, playlistEnd: 10 }),
        ).resolves.toEqual({
            channelInput: '@alpha',
            pageRange: { playlistStart: 1, playlistEnd: 10 },
            videos: [
                {
                    youtubeVideoId: 'vid-2',
                    title: 'Video Two',
                    url: 'https://www.youtube.com/watch?v=vid-2',
                },
            ],
        });
    });

    it('downloads manual json3 captions before automatic captions', async () => {
        mockYoutubeDl.mockResolvedValue({
            subtitles: {
                en: [
                    {
                        ext: 'json3',
                        url: 'https://captions.example/manual.json3',
                    },
                ],
            },
            automatic_captions: {
                en: [
                    {
                        ext: 'json3',
                        url: 'https://captions.example/automatic.json3',
                    },
                ],
            },
        });
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: async () => new TextEncoder().encode('{"events":[]}').buffer,
        } as Response);

        await expect(
            createProductionYoutubeSource().downloadJson3Captions(
                [{ videoId: 'vid-1', language: 'en', preferManual: true }],
                '/tmp/captions',
            ),
        ).resolves.toEqual([
            {
                videoId: 'vid-1',
                language: 'en',
                captionSource: 'manual',
                filePath: '/tmp/captions/vid-1.manual.en.json3',
            },
        ]);

        expect(mockYoutubeDl).toHaveBeenCalledWith('https://www.youtube.com/watch?v=vid-1', {
            dumpSingleJson: true,
            skipDownload: true,
        });
        expect(mockFetch).toHaveBeenCalledWith('https://captions.example/manual.json3');
        expect(mockWriteFile).toHaveBeenCalledWith(
            '/tmp/captions/vid-1.manual.en.json3',
            new TextEncoder().encode('{"events":[]}'),
        );
    });

    it('falls back to automatic json3 captions when manual captions are unavailable', async () => {
        mockYoutubeDl.mockResolvedValue({
            subtitles: {},
            automatic_captions: {
                en: [
                    {
                        ext: 'json3',
                        url: 'https://captions.example/automatic.json3',
                    },
                ],
            },
        });
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: async () => new TextEncoder().encode('{"events":[]}').buffer,
        } as Response);

        await expect(
            createProductionYoutubeSource().downloadJson3Captions(
                [{ videoId: 'vid-1', language: 'en', preferManual: true }],
                '/tmp/captions',
            ),
        ).resolves.toEqual([
            {
                videoId: 'vid-1',
                language: 'en',
                captionSource: 'automatic',
                filePath: '/tmp/captions/vid-1.automatic.en.json3',
            },
        ]);

        expect(mockFetch).toHaveBeenCalledWith('https://captions.example/automatic.json3');
    });

    it('prefers automatic captions when preferManual is false', async () => {
        mockYoutubeDl.mockResolvedValue({
            subtitles: {
                en: [
                    {
                        ext: 'json3',
                        url: 'https://captions.example/manual.json3',
                    },
                ],
            },
            automatic_captions: {
                en: [
                    {
                        ext: 'json3',
                        url: 'https://captions.example/automatic.json3',
                    },
                ],
            },
        });
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: async () => new TextEncoder().encode('{"events":[]}').buffer,
        } as Response);

        await expect(
            createProductionYoutubeSource().downloadJson3Captions(
                [{ videoId: 'vid-1', language: 'en', preferManual: false }],
                '/tmp/captions',
            ),
        ).resolves.toEqual([
            {
                videoId: 'vid-1',
                language: 'en',
                captionSource: 'automatic',
                filePath: '/tmp/captions/vid-1.automatic.en.json3',
            },
        ]);

        expect(mockFetch).toHaveBeenCalledWith('https://captions.example/automatic.json3');
    });

    it('skips caption requests when no json3 captions are available', async () => {
        mockYoutubeDl.mockResolvedValue({
            subtitles: {
                en: [{ ext: 'vtt', url: 'https://captions.example/manual.vtt' }],
            },
            automatic_captions: {},
        });

        await expect(
            createProductionYoutubeSource().downloadJson3Captions(
                [{ videoId: 'vid-1', language: 'en', preferManual: true }],
                '/tmp/captions',
            ),
        ).resolves.toEqual([]);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('returns no caption when the requested language is unavailable', async () => {
        mockYoutubeDl.mockResolvedValue({
            subtitles: {
                fr: [{ ext: 'json3', url: 'https://captions.example/manual.fr.json3' }],
            },
            automatic_captions: {
                fr: [{ ext: 'json3', url: 'https://captions.example/automatic.fr.json3' }],
            },
        });

        await expect(
            createProductionYoutubeSource().downloadJson3Captions(
                [{ videoId: 'vid-1', language: 'en', preferManual: true }],
                '/tmp/captions',
            ),
        ).resolves.toEqual([]);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('throws when the selected caption track cannot be fetched', async () => {
        mockYoutubeDl.mockResolvedValue({
            subtitles: {
                en: [{ ext: 'json3', url: 'https://captions.example/manual.json3' }],
            },
            automatic_captions: {},
        });
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValue({
            ok: false,
        } as Response);

        await expect(
            createProductionYoutubeSource().downloadJson3Captions(
                [{ videoId: 'vid-1', language: 'en', preferManual: true }],
                '/tmp/captions',
            ),
        ).rejects.toThrow('Failed to download json3 captions for video vid-1.');
    });

    it('returns only the caption requests that actually download successfully', async () => {
        mockYoutubeDl
            .mockResolvedValueOnce({
                subtitles: {
                    en: [{ ext: 'json3', url: 'https://captions.example/vid-1.manual.json3' }],
                },
                automatic_captions: {},
            })
            .mockResolvedValueOnce({
                subtitles: {},
                automatic_captions: {},
            });
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: async () => new TextEncoder().encode('{"events":[]}').buffer,
        } as Response);

        await expect(
            createProductionYoutubeSource().downloadJson3Captions(
                [
                    { videoId: 'vid-1', language: 'en', preferManual: true },
                    { videoId: 'vid-2', language: 'en', preferManual: true },
                ],
                '/tmp/captions',
            ),
        ).resolves.toEqual([
            {
                videoId: 'vid-1',
                language: 'en',
                captionSource: 'manual',
                filePath: '/tmp/captions/vid-1.manual.en.json3',
            },
        ]);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });
});
