import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createSchemaBackedTestDb, resetSchemaBackedTestDb } from '../../test-support/createSchemaBackedTestDb';

const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();

const mockDb = createSchemaBackedTestDb();

jest.mock('../../lib/sqlite/db', () => ({
    __esModule: true,
    default: mockDb,
}));

jest.mock('../../shared/logger', () => ({
    logger: {
        info: (...args: unknown[]) => mockLoggerInfo(...args),
        warn: (...args: unknown[]) => mockLoggerWarn(...args),
    },
}));

import { createProductionIngestStorage } from '../ingestStorage';

describe('createProductionIngestStorage', () => {
    beforeEach(() => {
        resetSchemaBackedTestDb(mockDb);
        mockLoggerInfo.mockClear();
        mockLoggerWarn.mockClear();
    });

    afterAll(() => {
        mockDb.close();
    });

    it('creates and reuses stub creators by name', async () => {
        const storage = createProductionIngestStorage();

        await expect(storage.findOrCreateStubCreator({ name: 'Alpha', channelName: 'Alpha Channel' }))
            .resolves.toEqual({ creatorId: 1, name: 'Alpha' });
        await expect(storage.findOrCreateStubCreator({ name: 'Alpha', channelName: 'Alpha Channel' }))
            .resolves.toEqual({ creatorId: 1, name: 'Alpha' });
        expect(mockDb.prepare('SELECT COUNT(*) AS count FROM creators').get()).toEqual({ count: 1 });
    });

    it('skips missing channels when createChannel is false', async () => {
        const storage = createProductionIngestStorage();

        await expect(storage.findOrCreateYoutubeChannel({
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        }, { createChannel: false })).resolves.toBeUndefined();

        expect(mockDb.prepare('SELECT COUNT(*) AS count FROM creators').get()).toEqual({ count: 0 });
        expect(mockDb.prepare('SELECT COUNT(*) AS count FROM channels').get()).toEqual({ count: 0 });
    });

    it('creates and updates YouTube channels through creator-backed storage', async () => {
        const storage = createProductionIngestStorage();

        await expect(storage.findOrCreateYoutubeChannel({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            description: 'First description',
            followers: 10,
            tags: ['apologetics'],
            url: 'https://www.youtube.com/@alpha',
        }, { createChannel: true })).resolves.toEqual({
            channelId: 1,
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        });

        await expect(storage.findOrCreateYoutubeChannel({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            description: 'Updated description',
            followers: 12,
            url: 'https://www.youtube.com/@alpha/videos',
        }, { createChannel: true })).resolves.toEqual({
            channelId: 1,
            youtubeChannelId: 'UC123',
            handle: '@alpha',
        });

        expect(mockDb.prepare('SELECT COUNT(*) AS count FROM creators').get()).toEqual({ count: 1 });
        expect(mockDb.prepare('SELECT * FROM channels WHERE handle = ?').get('@alpha')).toMatchObject({
            id: 1,
            youtube_channel_id: 'UC123',
            name: 'Alpha',
            description: 'Updated description',
            followers: 12,
            url: 'https://www.youtube.com/@alpha/videos',
            creator_id: 1,
        });
    });

    it('saves videos and finds videos needing transcript backfill', async () => {
        const storage = createProductionIngestStorage();
        const channel = await storage.findOrCreateYoutubeChannel({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        }, { createChannel: true });

        expect(channel).toBeDefined();
        await expect(storage.saveVideos(channel!.channelId, [
            { youtubeVideoId: 'vid-1', title: 'One', url: 'https://youtube.com/watch?v=vid-1' },
            { youtubeVideoId: 'vid-2', title: 'Two', url: 'https://youtube.com/watch?v=vid-2' },
        ])).resolves.toEqual({
            savedCount: 2,
            videos: [
                { id: 1, youtubeVideoId: 'vid-1' },
                { id: 2, youtubeVideoId: 'vid-2' },
            ],
        });

        await storage.saveTranscriptVersion({
            videoId: 1,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });

        await expect(storage.findVideosMissingTranscripts(channel!.channelId)).resolves.toEqual([
            { id: 2, youtubeVideoId: 'vid-2' },
        ]);
    });

    it('skips unchanged transcript versions and stores changed versions with segments', async () => {
        const storage = createProductionIngestStorage();
        const channel = await storage.findOrCreateYoutubeChannel({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        }, { createChannel: true });
        await storage.saveVideos(channel!.channelId, [
            { youtubeVideoId: 'vid-1', title: 'One', url: 'https://youtube.com/watch?v=vid-1' },
        ]);

        const first = await storage.saveTranscriptVersion({
            videoId: 1,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });
        const unchanged = await storage.saveTranscriptVersion({
            videoId: 1,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });
        const changed = await storage.saveTranscriptVersion({
            videoId: 1,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[{"tStartMs":0}]}',
            checksum: 'checksum-two',
        });

        expect(first).toMatchObject({ transcriptId: 1, version: 1, isNewVersion: true });
        expect(unchanged).toMatchObject({ transcriptId: 1, version: 1, isNewVersion: false });
        expect(changed).toMatchObject({ transcriptId: 2, version: 2, isNewVersion: true });
        expect(mockDb.prepare('SELECT COUNT(*) AS count FROM transcripts').get()).toEqual({ count: 2 });

        await expect(storage.saveTranscriptSegments([
            { transcriptId: changed.transcriptId, idx: 0, startMs: 0, endMs: 1000, text: 'Hello' },
            { transcriptId: changed.transcriptId, idx: 1, startMs: 1000, endMs: 2000, text: 'world' },
        ])).resolves.toEqual({ savedCount: 2 });
        expect(mockDb.prepare('SELECT COUNT(*) AS count FROM transcript_segments').get()).toEqual({ count: 2 });
    });
});
