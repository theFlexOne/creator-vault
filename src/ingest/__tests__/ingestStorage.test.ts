import { describe, expect, it } from '@jest/globals';
import { createProductionIngestStorageStub } from '../ingestStorage';

describe('createProductionIngestStorageStub', () => {
    it('throws for stub creator lookup until production storage is wired', async () => {
        const storage = createProductionIngestStorageStub();

        await expect(
            storage.findOrCreateStubCreator({ name: 'Alpha', channelName: 'Alpha Channel' }),
        ).rejects.toThrow('TODO: wire production ingest storage for stub creator lookup');
    });

    it('throws for YouTube channel lookup until production storage is wired', async () => {
        const storage = createProductionIngestStorageStub();

        await expect(
            storage.findOrCreateYoutubeChannel({ handle: '@alpha' }, { createChannel: false }),
        ).rejects.toThrow('TODO: wire production ingest storage for YouTube channel lookup');
    });

    it('throws for video persistence until production storage is wired', async () => {
        const storage = createProductionIngestStorageStub();

        await expect(storage.saveVideos(1, [{ youtubeVideoId: 'abc123' }])).rejects.toThrow(
            'TODO: wire production ingest storage for video persistence',
        );
    });

    it('throws for transcript version and segment storage until future schema is wired', async () => {
        const storage = createProductionIngestStorageStub();

        await expect(
            storage.findLatestTranscriptVersion({ videoId: 1, captionSource: 'manual', language: 'en' }),
        ).rejects.toThrow('TODO: wire production ingest storage for latest transcript version lookup');

        await expect(
            storage.saveTranscriptVersion({
                videoId: 1,
                captionSource: 'manual',
                language: 'en',
                rawFormat: 'json3',
                rawBlob: '{}',
                checksum: 'sha256:abc',
            }),
        ).rejects.toThrow('TODO: wire production ingest storage for transcript version persistence');

        await expect(
            storage.saveTranscriptSegments([{ transcriptId: 1, idx: 0, startMs: 0, endMs: 1000, text: 'hello' }]),
        ).rejects.toThrow('TODO: wire production ingest storage for transcript segment persistence');
    });
});
