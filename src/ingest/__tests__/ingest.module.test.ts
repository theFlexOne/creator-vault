import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createIngestModule } from '../ingest.module';
import type { CreateIngestModuleDependencies } from '../ingest.module';
import type { ChannelVideosPageRange } from '../youtubeSource';
import type {
    SaveTranscriptVersionInput,
    StubCreatorInput,
    TranscriptSegmentInput,
} from '../ingestStorage';
import type { ChannelRecord, VideoRecord } from '../../types/ingestion.types';

const mockReadFile = jest.fn<(path: string, encoding: BufferEncoding) => Promise<string>>();

jest.mock('fs/promises', () => ({
    readFile: (path: string, encoding: BufferEncoding) => mockReadFile(path, encoding),
}));

const createDependencies = (): CreateIngestModuleDependencies => ({
    inputLoader: {
        resolveIdentifiers: jest.fn(async () => []),
    },
    youtubeSource: {
        fetchChannelProfile: jest.fn(async () => undefined),
        fetchChannelVideosPage: jest.fn(async (input: string, pageRange: ChannelVideosPageRange) => ({
            channelInput: input,
            pageRange,
            videos: [],
        })),
        downloadJson3Captions: jest.fn(async () => []),
    },
    storage: {
        findOrCreateStubCreator: jest.fn(async (input: StubCreatorInput) => ({ creatorId: 1, name: input.name })),
        findOrCreateYoutubeChannel: jest.fn(async (channel: ChannelRecord) => ({
            channelId: 1,
            youtubeChannelId: channel.youtubeChannelId,
            handle: channel.handle,
        })),
        saveVideos: jest.fn(async (_channelId: number, videos: VideoRecord[]) => ({
            savedCount: videos.length,
            videos: [],
        })),
        findLatestTranscriptVersion: jest.fn(async () => undefined),
        saveTranscriptVersion: jest.fn(async (input: SaveTranscriptVersionInput) => ({
            transcriptId: 1,
            videoId: input.videoId,
            captionSource: input.captionSource,
            language: input.language,
            version: 1,
            rawFormat: input.rawFormat,
            rawBlob: input.rawBlob,
            checksum: input.checksum,
            isNewVersion: true,
        })),
        saveTranscriptSegments: jest.fn(async (segments: TranscriptSegmentInput[]) => ({ savedCount: segments.length })),
        findVideosMissingTranscripts: jest.fn(async () => []),
    },
    tempDirectoryProvider: {
        getTempDirectory: jest.fn(() => '/tmp/creator-vault'),
    },
    reporter: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
});

describe('createIngestModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('orchestrates channel profile ingestion through source and storage dependencies', async () => {
        const dependencies = createDependencies();
        const channel = {
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        };
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.youtubeSource.fetchChannelProfile).mockResolvedValue(channel);
        jest.mocked(dependencies.storage.findOrCreateYoutubeChannel).mockResolvedValue({
            channelId: 7,
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        });

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestChannelProfile(['channels.txt'], { save: true })).resolves.toEqual({
            kind: 'channels',
            inputs: ['channels.txt'],
            resolved: ['@alpha'],
            save: true,
            dryRun: false,
            fetched: [channel],
            failed: [],
            savedCount: 1,
            skippedRecords: 0,
            failures: [],
        });

        expect(dependencies.inputLoader.resolveIdentifiers).toHaveBeenCalledWith(['channels.txt']);
        expect(dependencies.youtubeSource.fetchChannelProfile).toHaveBeenCalledWith('@alpha');
        expect(dependencies.storage.findOrCreateYoutubeChannel).toHaveBeenCalledWith(channel, { createChannel: true });
    });

    it('does not write channel profiles when save is false', async () => {
        const dependencies = createDependencies();
        const channel = {
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        };
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.youtubeSource.fetchChannelProfile).mockResolvedValue(channel);

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestChannelProfile(['@alpha'], { save: false })).resolves.toMatchObject({
            dryRun: true,
            fetched: [channel],
            savedCount: 0,
            skippedRecords: 1,
        });

        expect(dependencies.storage.findOrCreateYoutubeChannel).not.toHaveBeenCalled();
    });

    it('orchestrates channel videos through source, storage, json3 parsing, and transcript storage', async () => {
        const dependencies = createDependencies();
        const channel = {
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        };
        const rawJson3 = '{"events":[{"tStartMs":0,"dDurationMs":1000,"segs":[{"utf8":"Hello"}]}]}';
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.youtubeSource.fetchChannelProfile).mockResolvedValue(channel);
        jest.mocked(dependencies.youtubeSource.fetchChannelVideosPage).mockResolvedValue({
            channelInput: '@alpha',
            pageRange: { playlistStart: 1, playlistEnd: 2 },
            videos: [
                { youtubeVideoId: 'vid-1', title: 'One', url: 'https://youtube.com/watch?v=vid-1' },
                { youtubeVideoId: 'vid-2', title: 'Two', url: 'https://youtube.com/watch?v=vid-2' },
            ],
        });
        jest.mocked(dependencies.storage.findOrCreateYoutubeChannel).mockResolvedValue({
            channelId: 7,
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        });
        jest.mocked(dependencies.storage.saveVideos).mockResolvedValue({
            savedCount: 2,
            videos: [
                { id: 10, youtubeVideoId: 'vid-1' },
                { id: 11, youtubeVideoId: 'vid-2' },
            ],
        });
        jest.mocked(dependencies.youtubeSource.downloadJson3Captions).mockResolvedValue([
            {
                videoId: 'vid-1',
                language: 'en',
                captionSource: 'manual',
                filePath: '/tmp/creator-vault/vid-1.manual.en.json3',
            },
        ]);
        mockReadFile.mockResolvedValue(rawJson3);
        jest.mocked(dependencies.storage.saveTranscriptVersion).mockResolvedValue({
            transcriptId: 99,
            videoId: 10,
            captionSource: 'manual',
            language: 'en',
            version: 1,
            rawFormat: 'json3',
            rawBlob: rawJson3,
            checksum: 'sha256:test',
            isNewVersion: true,
        });

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestChannelVideos(['channels.txt'], {
            limit: 2,
            save: true,
            batch: 2,
            createChannel: true,
        }))
            .resolves.toMatchObject({
                kind: 'videos',
                inputs: ['channels.txt'],
                resolved: ['@alpha'],
                save: true,
                dryRun: false,
                createChannel: true,
                limit: 2,
                batchSize: 2,
                channelsTotal: 1,
                channelsSucceeded: 1,
                channelsFailed: 0,
                channelsSkipped: 0,
                batchesFailed: 0,
                videosUpserted: 2,
                captionsRequested: 2,
                captionsDownloaded: 1,
                captionsMissing: 1,
                transcriptVersionsCreated: 1,
                transcriptSegmentsSaved: 1,
                skippedRecords: 0,
                parserDiagnostics: [],
                failures: [],
                channelReports: [
                    {
                        identifier: '@alpha',
                        fetchedChannel: channel,
                        videoUrlsDiscovered: 2,
                        videosFetched: 2,
                        videosUpserted: 2,
                        batchFailures: 0,
                        captionsRequested: 2,
                        captionsDownloaded: 1,
                        captionsMissing: 1,
                        transcriptVersionsCreated: 1,
                        transcriptSegmentsSaved: 1,
                        skippedRecords: 0,
                        parserDiagnostics: [],
                        failures: [],
                        failed: false,
                        skipped: false,
                    },
                ],
            });

        expect(dependencies.youtubeSource.fetchChannelVideosPage).toHaveBeenCalledWith('@alpha', {
            playlistStart: 1,
            playlistEnd: 2,
        });
        expect(dependencies.storage.saveVideos).toHaveBeenCalledWith(7, [
            { youtubeVideoId: 'vid-1', title: 'One', url: 'https://youtube.com/watch?v=vid-1' },
            { youtubeVideoId: 'vid-2', title: 'Two', url: 'https://youtube.com/watch?v=vid-2' },
        ]);
        expect(dependencies.youtubeSource.downloadJson3Captions).toHaveBeenCalledWith([
            { videoId: 'vid-1', language: 'en', preferManual: true },
            { videoId: 'vid-2', language: 'en', preferManual: true },
        ], '/tmp/creator-vault');
        expect(dependencies.storage.saveTranscriptVersion).toHaveBeenCalledWith(expect.objectContaining({
            videoId: 10,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: rawJson3,
            checksum: expect.stringMatching(/^sha256:/),
        }));
        expect(dependencies.storage.saveTranscriptSegments).toHaveBeenCalledWith([
            { transcriptId: 99, idx: 0, startMs: 0, endMs: 1000, text: 'Hello' },
        ]);
    });

    it('does not write videos or transcripts when channel video save is false', async () => {
        const dependencies = createDependencies();
        const channel = {
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        };
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.youtubeSource.fetchChannelProfile).mockResolvedValue(channel);
        jest.mocked(dependencies.youtubeSource.fetchChannelVideosPage).mockResolvedValue({
            channelInput: '@alpha',
            pageRange: { playlistStart: 1, playlistEnd: 1 },
            videos: [
                { youtubeVideoId: 'vid-1', title: 'One', url: 'https://youtube.com/watch?v=vid-1' },
            ],
        });

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestChannelVideos(['@alpha'], {
            limit: 1,
            save: false,
            batch: 1,
            createChannel: false,
        }))
            .resolves.toMatchObject({
                dryRun: true,
                createChannel: false,
                videosUpserted: 0,
                skippedRecords: 1,
                channelReports: [
                    {
                        identifier: '@alpha',
                        videosFetched: 1,
                        videosUpserted: 0,
                        skippedRecords: 1,
                    },
                ],
            });

        expect(dependencies.storage.findOrCreateYoutubeChannel).not.toHaveBeenCalled();
        expect(dependencies.storage.saveVideos).not.toHaveBeenCalled();
        expect(dependencies.youtubeSource.downloadJson3Captions).not.toHaveBeenCalled();
        expect(dependencies.storage.saveTranscriptVersion).not.toHaveBeenCalled();
        expect(dependencies.storage.saveTranscriptSegments).not.toHaveBeenCalled();
    });

    it('skips channel video saves when createChannel is false and the channel is missing', async () => {
        const dependencies = createDependencies();
        const channel = {
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        };
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.youtubeSource.fetchChannelProfile).mockResolvedValue(channel);
        jest.mocked(dependencies.storage.findOrCreateYoutubeChannel).mockResolvedValue(undefined);

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestChannelVideos(['@alpha'], {
            limit: 1,
            save: true,
            batch: 1,
            createChannel: false,
        })).resolves.toMatchObject({
            createChannel: false,
            channelsSkipped: 1,
            channelsFailed: 0,
            skippedRecords: 1,
            channelReports: [
                {
                    identifier: '@alpha',
                    skipped: true,
                    skippedRecords: 1,
                    failed: false,
                },
            ],
        });

        expect(dependencies.storage.findOrCreateYoutubeChannel).toHaveBeenCalledWith(channel, { createChannel: false });
        expect(dependencies.youtubeSource.fetchChannelVideosPage).not.toHaveBeenCalled();
        expect(dependencies.storage.saveVideos).not.toHaveBeenCalled();
    });

    it('reports parser diagnostics and unchanged transcript versions for channel videos', async () => {
        const dependencies = createDependencies();
        const channel = {
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        };
        const rawJson3 = '{"events":[{"segs":[{"utf8":"No timing"}]}]}';
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.youtubeSource.fetchChannelProfile).mockResolvedValue(channel);
        jest.mocked(dependencies.youtubeSource.fetchChannelVideosPage).mockResolvedValue({
            channelInput: '@alpha',
            pageRange: { playlistStart: 1, playlistEnd: 1 },
            videos: [
                { youtubeVideoId: 'vid-1', title: 'One', url: 'https://youtube.com/watch?v=vid-1' },
            ],
        });
        jest.mocked(dependencies.storage.findOrCreateYoutubeChannel).mockResolvedValue({
            channelId: 7,
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        });
        jest.mocked(dependencies.storage.saveVideos).mockResolvedValue({
            savedCount: 1,
            videos: [{ id: 10, youtubeVideoId: 'vid-1' }],
        });
        jest.mocked(dependencies.youtubeSource.downloadJson3Captions).mockResolvedValue([
            {
                videoId: 'vid-1',
                language: 'en',
                captionSource: 'manual',
                filePath: '/tmp/creator-vault/vid-1.manual.en.json3',
            },
        ]);
        mockReadFile.mockResolvedValue(rawJson3);
        jest.mocked(dependencies.storage.saveTranscriptVersion).mockResolvedValue({
            transcriptId: 99,
            videoId: 10,
            captionSource: 'manual',
            language: 'en',
            version: 1,
            rawFormat: 'json3',
            rawBlob: rawJson3,
            checksum: 'sha256:test',
            isNewVersion: false,
        });

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestChannelVideos(['@alpha'], {
            limit: 1,
            save: true,
            batch: 1,
            createChannel: true,
        })).resolves.toMatchObject({
            captionsRequested: 1,
            captionsDownloaded: 1,
            transcriptVersionsCreated: 0,
            transcriptVersionsUnchanged: 1,
            transcriptSegmentsSaved: 0,
            parserDiagnostics: [
                {
                    videoId: 10,
                    youtubeVideoId: 'vid-1',
                    captionSource: 'manual',
                    language: 'en',
                    code: 'MISSING_TIMING',
                    eventIndex: 0,
                },
            ],
            channelReports: [
                {
                    parserDiagnostics: [
                        {
                            videoId: 10,
                            youtubeVideoId: 'vid-1',
                            code: 'MISSING_TIMING',
                        },
                    ],
                    transcriptVersionsUnchanged: 1,
                },
            ],
        });

        expect(dependencies.storage.saveTranscriptSegments).not.toHaveBeenCalled();
    });

    it('reports caption download failures without failing the entire channel', async () => {
        const dependencies = createDependencies();
        const channel = {
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        };
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.youtubeSource.fetchChannelProfile).mockResolvedValue(channel);
        jest.mocked(dependencies.youtubeSource.fetchChannelVideosPage).mockResolvedValue({
            channelInput: '@alpha',
            pageRange: { playlistStart: 1, playlistEnd: 1 },
            videos: [
                { youtubeVideoId: 'vid-1', title: 'One', url: 'https://youtube.com/watch?v=vid-1' },
            ],
        });
        jest.mocked(dependencies.storage.findOrCreateYoutubeChannel).mockResolvedValue({
            channelId: 7,
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        });
        jest.mocked(dependencies.storage.saveVideos).mockResolvedValue({
            savedCount: 1,
            videos: [{ id: 10, youtubeVideoId: 'vid-1' }],
        });
        jest.mocked(dependencies.youtubeSource.downloadJson3Captions).mockRejectedValue(new Error('caption failed'));

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestChannelVideos(['@alpha'], {
            limit: 1,
            save: true,
            batch: 1,
            createChannel: true,
        })).resolves.toMatchObject({
            channelsSucceeded: 1,
            channelsFailed: 0,
            captionsRequested: 1,
            captionsFailed: 1,
            failures: [
                {
                    scope: 'caption',
                    identifier: '@alpha',
                    message: 'caption failed',
                },
            ],
        });

        expect(dependencies.storage.saveTranscriptVersion).not.toHaveBeenCalled();
        expect(dependencies.storage.saveTranscriptSegments).not.toHaveBeenCalled();
    });

    it('orchestrates transcript backfills without fetching channel or video metadata', async () => {
        const dependencies = createDependencies();
        const rawJson3 = '{"events":[{"tStartMs":500,"dDurationMs":1500,"segs":[{"utf8":"Backfill"}]}]}';
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.storage.findOrCreateYoutubeChannel).mockResolvedValue({
            channelId: 7,
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        });
        jest.mocked(dependencies.storage.findVideosMissingTranscripts).mockResolvedValue([
            { id: 10, youtubeVideoId: 'vid-1' },
        ]);
        jest.mocked(dependencies.youtubeSource.downloadJson3Captions).mockResolvedValue([
            {
                videoId: 'vid-1',
                language: 'en',
                captionSource: 'automatic',
                filePath: '/tmp/creator-vault/vid-1.automatic.en.json3',
            },
        ]);
        mockReadFile.mockResolvedValue(rawJson3);
        jest.mocked(dependencies.storage.saveTranscriptVersion).mockResolvedValue({
            transcriptId: 100,
            videoId: 10,
            captionSource: 'automatic',
            language: 'en',
            version: 1,
            rawFormat: 'json3',
            rawBlob: rawJson3,
            checksum: 'sha256:test',
            isNewVersion: true,
        });

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestTranscripts(['channels.txt'], { limit: 1, save: true }))
            .resolves.toEqual({
                kind: 'transcripts',
                inputs: ['channels.txt'],
                resolved: ['@alpha'],
                save: true,
                dryRun: false,
                limit: 1,
                channelsProcessed: 1,
                missingChannels: [],
                transcriptsFetched: 1,
                transcriptsStored: 1,
                captionsRequested: 1,
                captionsDownloaded: 1,
                captionsMissing: 0,
                captionsFailed: 0,
                transcriptVersionsCreated: 1,
                transcriptVersionsUnchanged: 0,
                transcriptSegmentsSaved: 1,
                skippedRecords: 0,
                parserDiagnostics: [],
                failures: [],
                results: [
                    {
                        channel: '@alpha',
                        transcripts: [{
                            videoId: 10,
                            youtubeVideoId: 'vid-1',
                            captionSource: 'automatic',
                            language: 'en',
                            segmentCount: 1,
                            transcriptVersionCreated: true,
                        }],
                    },
                ],
            });

        expect(dependencies.storage.findOrCreateYoutubeChannel).toHaveBeenCalledWith({
            youtubeChannelId: '@alpha',
            handle: '@alpha',
        }, { createChannel: false });
        expect(dependencies.storage.findVideosMissingTranscripts).toHaveBeenCalledWith(7, 1);
        expect(dependencies.youtubeSource.downloadJson3Captions).toHaveBeenCalledWith([
            { videoId: 'vid-1', language: 'en', preferManual: true },
        ], '/tmp/creator-vault');
        expect(dependencies.youtubeSource.fetchChannelProfile).not.toHaveBeenCalled();
        expect(dependencies.youtubeSource.fetchChannelVideosPage).not.toHaveBeenCalled();
        expect(dependencies.storage.saveTranscriptVersion).toHaveBeenCalledWith(expect.objectContaining({
            videoId: 10,
            captionSource: 'automatic',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: rawJson3,
            checksum: expect.stringMatching(/^sha256:/),
        }));
        expect(dependencies.storage.saveTranscriptSegments).toHaveBeenCalledWith([
            { transcriptId: 100, idx: 0, startMs: 500, endMs: 2000, text: 'Backfill' },
        ]);
    });

    it('does not write transcript backfills when save is false', async () => {
        const dependencies = createDependencies();
        const rawJson3 = '{"events":[{"tStartMs":500,"dDurationMs":1500,"segs":[{"utf8":"Backfill"}]}]}';
        jest.mocked(dependencies.inputLoader.resolveIdentifiers).mockResolvedValue(['@alpha']);
        jest.mocked(dependencies.storage.findOrCreateYoutubeChannel).mockResolvedValue({
            channelId: 7,
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        });
        jest.mocked(dependencies.storage.findVideosMissingTranscripts).mockResolvedValue([
            { id: 10, youtubeVideoId: 'vid-1' },
        ]);
        jest.mocked(dependencies.youtubeSource.downloadJson3Captions).mockResolvedValue([
            {
                videoId: 'vid-1',
                language: 'en',
                captionSource: 'automatic',
                filePath: '/tmp/creator-vault/vid-1.automatic.en.json3',
            },
        ]);
        mockReadFile.mockResolvedValue(rawJson3);

        const ingest = createIngestModule(dependencies);

        await expect(ingest.ingestTranscripts(['@alpha'], { limit: 1, save: false }))
            .resolves.toMatchObject({
                dryRun: true,
                transcriptsFetched: 1,
                transcriptsStored: 0,
                captionsRequested: 1,
                captionsDownloaded: 1,
                captionsMissing: 0,
                skippedRecords: 0,
                results: [
                    {
                        channel: '@alpha',
                        transcripts: [{
                            videoId: 10,
                            youtubeVideoId: 'vid-1',
                            captionSource: 'automatic',
                            language: 'en',
                            segmentCount: 1,
                        }],
                    },
                ],
            });

        expect(dependencies.storage.saveTranscriptVersion).not.toHaveBeenCalled();
        expect(dependencies.storage.saveTranscriptSegments).not.toHaveBeenCalled();
    });
});
