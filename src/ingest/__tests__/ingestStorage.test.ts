import Database from 'better-sqlite3';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();

const mockDb = new Database(':memory:');

mockDb.exec(`
    CREATE TABLE creators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        occupation TEXT,
        education TEXT
    );

    CREATE TABLE channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        youtube_channel_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        handle TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        followers INTEGER NOT NULL DEFAULT 0,
        source_tags TEXT NOT NULL DEFAULT '[]',
        url TEXT UNIQUE NOT NULL,
        creator_id INTEGER NOT NULL,
        FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE
    );

    CREATE TABLE videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        youtube_video_id TEXT UNIQUE NOT NULL,
        channel_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        duration INTEGER NOT NULL DEFAULT 0,
        upload_date TEXT,
        view_count INTEGER NOT NULL DEFAULT 0,
        categories TEXT NOT NULL DEFAULT '[]',
        source_tags TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE
    );

    CREATE TABLE transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL,
        caption_source TEXT NOT NULL,
        language TEXT NOT NULL,
        version INTEGER NOT NULL,
        raw_format TEXT NOT NULL,
        raw_blob TEXT NOT NULL,
        checksum TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE,
        UNIQUE (video_id, caption_source, language, version),
        CHECK (caption_source IN ('manual', 'automatic')),
        CHECK (raw_format = 'json3')
    );

    CREATE TABLE transcript_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transcript_id INTEGER NOT NULL,
        idx INTEGER NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        text TEXT NOT NULL,
        speaker TEXT,
        confidence REAL,
        FOREIGN KEY (transcript_id) REFERENCES transcripts (id) ON DELETE CASCADE,
        UNIQUE (transcript_id, idx)
    );
`);

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
        mockDb.exec('DELETE FROM transcript_segments;');
        mockDb.exec('DELETE FROM transcripts;');
        mockDb.exec('DELETE FROM videos;');
        mockDb.exec('DELETE FROM channels;');
        mockDb.exec('DELETE FROM creators;');
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'transcript_segments';");
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'transcripts';");
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'videos';");
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'channels';");
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'creators';");
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
