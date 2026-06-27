import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createIngestModule } from '../ingest.module';
import type { IngestModule } from '../ingest.types';
import type { CreateIngestModuleDependencies } from '../ingest.module';

const createAdapter = (): jest.Mocked<IngestModule> => ({
    ingestChannelProfile: jest.fn<IngestModule['ingestChannelProfile']>(),
    ingestChannelVideos: jest.fn<IngestModule['ingestChannelVideos']>(),
    ingestTranscripts: jest.fn<IngestModule['ingestTranscripts']>(),
});

const createDependencies = (adapter: jest.Mocked<IngestModule>): CreateIngestModuleDependencies => ({
    legacyWorkflowAdapter: adapter,
    inputLoader: {
        resolveIdentifiers: async () => [],
    },
    youtubeSource: {
        fetchChannelProfile: async () => undefined,
        fetchChannelVideosPage: async (input, pageRange) => ({
            channelInput: input,
            pageRange,
            videos: [],
        }),
        downloadJson3Captions: async () => [],
    },
    storage: {
        findOrCreateStubCreator: async (input) => ({ creatorId: 1, name: input.name }),
        findOrCreateYoutubeChannel: async (channel) => ({
            channelId: 1,
            youtubeChannelId: channel.youtubeChannelId,
            handle: channel.handle,
        }),
        saveVideos: async (_channelId, videos) => ({ savedCount: videos.length }),
        findLatestTranscriptVersion: async () => undefined,
        saveTranscriptVersion: async (input) => ({
            transcriptId: 1,
            videoId: input.videoId,
            captionSource: input.captionSource,
            language: input.language,
            version: 1,
            rawFormat: input.rawFormat,
            checksum: input.checksum,
        }),
        saveTranscriptSegments: async (segments) => ({ savedCount: segments.length }),
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
    let adapter: jest.Mocked<IngestModule>;

    beforeEach(() => {
        adapter = createAdapter();
    });

    it('routes channel profile ingestion through the configured workflow adapter', async () => {
        const report = { kind: 'channels' } as Awaited<ReturnType<IngestModule['ingestChannelProfile']>>;
        adapter.ingestChannelProfile.mockResolvedValue(report);
        const ingest = createIngestModule(createDependencies(adapter));

        await expect(ingest.ingestChannelProfile(['@alpha'], { save: true })).resolves.toBe(report);

        expect(adapter.ingestChannelProfile).toHaveBeenCalledWith(['@alpha'], { save: true });
    });

    it('routes channel video ingestion through the configured workflow adapter', async () => {
        const report = { kind: 'videos' } as Awaited<ReturnType<IngestModule['ingestChannelVideos']>>;
        adapter.ingestChannelVideos.mockResolvedValue(report);
        const ingest = createIngestModule(createDependencies(adapter));

        await expect(ingest.ingestChannelVideos(['@alpha'], { limit: 25, save: true, batch: 5 })).resolves.toBe(report);

        expect(adapter.ingestChannelVideos).toHaveBeenCalledWith(['@alpha'], { limit: 25, save: true, batch: 5 });
    });

    it('routes transcript ingestion through the configured workflow adapter', async () => {
        const report = { kind: 'transcripts' } as Awaited<ReturnType<IngestModule['ingestTranscripts']>>;
        adapter.ingestTranscripts.mockResolvedValue(report);
        const ingest = createIngestModule(createDependencies(adapter));

        await expect(ingest.ingestTranscripts(['@alpha'], { limit: 10, save: true })).resolves.toBe(report);

        expect(adapter.ingestTranscripts).toHaveBeenCalledWith(['@alpha'], { limit: 10, save: true });
    });
});
