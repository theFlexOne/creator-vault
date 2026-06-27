import Database from 'better-sqlite3';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { VideoDTO } from '../../domain/video/video.types';

const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

const mockDb = new Database(':memory:');

mockDb.exec(`
    CREATE TABLE channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        youtube_channel_id TEXT UNIQUE,
        name TEXT NOT NULL,
        handle TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        followers INTEGER NOT NULL DEFAULT 0,
        tags TEXT NOT NULL DEFAULT '[]',
        url TEXT UNIQUE NOT NULL
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
        tags TEXT NOT NULL DEFAULT '[]',
        transcript TEXT NOT NULL DEFAULT '[]',
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
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

import { getVideosMissingTranscripts, upsertVideoInfo } from '../../repositories/video.repository';
import { upsertChannelInfo } from '../../repositories/channel.repository';
import {
    findLatestTranscriptVersion,
    saveTranscriptSegments,
    saveTranscriptVersion,
    upsertTranscriptData,
} from '../../repositories/transcript.repository';

type ChannelRow = {
    id: number;
    youtube_channel_id: string | null;
    name: string;
    handle: string;
    description: string;
    followers: number;
    tags: string;
    url: string;
};

type VideoRow = {
    id: number;
    youtube_video_id: string;
    channel_id: number;
    title: string;
    url: string;
    description: string;
    duration: number;
    upload_date: string | null;
    view_count: number;
    categories: string;
    tags: string;
    transcript: string;
};

type TranscriptRow = {
    id: number;
    video_id: number;
    caption_source: string;
    language: string;
    version: number;
    raw_format: string;
    raw_blob: string;
    checksum: string;
    created_at: string;
};

type TranscriptSegmentRow = {
    id: number;
    transcript_id: number;
    idx: number;
    start_ms: number;
    end_ms: number;
    text: string;
    speaker: string | null;
    confidence: number | null;
};

describe('db.service upserts', () => {
    beforeEach(() => {
        mockDb.exec('DELETE FROM transcript_segments;');
        mockDb.exec('DELETE FROM transcripts;');
        mockDb.exec('DELETE FROM videos;');
        mockDb.exec('DELETE FROM channels;');
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'transcript_segments';");
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'transcripts';");
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'videos';");
        mockDb.exec("DELETE FROM sqlite_sequence WHERE name = 'channels';");
        mockLoggerInfo.mockClear();
        mockLoggerWarn.mockClear();
        mockLoggerError.mockClear();
    });

    afterAll(() => {
        mockDb.close();
    });

    it('inserts a new channel and returns its id', () => {
        const id = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            description: 'Alpha description',
            followers: 12,
            tags: ['news', 'updates'],
            url: 'https://www.youtube.com/@alpha',
        });

        expect(id).toBe(1);

        const row = mockDb.prepare('SELECT * FROM channels WHERE handle = ?').get('@alpha') as ChannelRow;
        expect(row).toEqual({
            id: 1,
            youtube_channel_id: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            description: 'Alpha description',
            followers: 12,
            tags: '["news","updates"]',
            url: 'https://www.youtube.com/@alpha',
        });
        expect(mockLoggerInfo).toHaveBeenCalledWith('Channel "Alpha" (ID: 1) upserted.');
    });

    it('updates the existing channel on handle conflict without overwriting null fields', () => {
        const insertedId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            description: 'Alpha description',
            followers: 12,
            tags: ['news', 'updates'],
            url: 'https://www.youtube.com/@alpha',
        });

        const updatedId = upsertChannelInfo({
            name: 'Alpha Updated',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha/videos',
        });

        expect(insertedId).toBe(1);
        expect(updatedId).toBe(1);

        const row = mockDb.prepare('SELECT * FROM channels WHERE handle = ?').get('@alpha') as ChannelRow;
        expect(row).toEqual({
            id: 1,
            youtube_channel_id: 'UC123',
            name: 'Alpha Updated',
            handle: '@alpha',
            description: 'Alpha description',
            followers: 12,
            tags: '["news","updates"]',
            url: 'https://www.youtube.com/@alpha/videos',
        });
        expect(mockDb.prepare('SELECT COUNT(*) AS count FROM channels').get()).toEqual({ count: 1 });
    });

    it('rejects channel payloads that miss required fields', () => {
        expect(() =>
            upsertChannelInfo({
                handle: '@alpha',
                url: 'https://www.youtube.com/@alpha',
            } as any),
        ).toThrow('Cannot upsert channel without name, handle, and url.');
    });

    it('upserts videos by youtube_video_id and assigns database id', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });

        const videos: VideoDTO[] = [
            {
                youtubeVideoId: 'vid-1',
                title: 'Video One',
                url: 'https://youtube.com/watch?v=vid-1',
                description: 'first',
                duration: 10,
                uploadDate: '20250101',
                viewCount: 101,
                categories: ['cat'],
                tags: ['tag'],
                transcript: '[]',
            },
        ];

        const count = upsertVideoInfo(channelId, videos);
        expect(count).toBe(1);
        expect(videos[0]!.id).toBe(1);
        expect(videos[0]!.channelId).toBe(channelId);

        const row = mockDb.prepare('SELECT * FROM videos WHERE youtube_video_id = ?').get('vid-1') as VideoRow;
        expect(row).toMatchObject({
            id: 1,
            youtube_video_id: 'vid-1',
            channel_id: channelId,
            title: 'Video One',
            url: 'https://youtube.com/watch?v=vid-1',
            description: 'first',
            duration: 10,
            upload_date: '20250101',
            view_count: 101,
            categories: '["cat"]',
            tags: '["tag"]',
            transcript: '[]',
        });
    });

    it('updates only defined video fields and preserves existing values for undefined inputs', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });

        upsertVideoInfo(channelId, [
            {
                youtubeVideoId: 'vid-1',
                title: 'Original',
                url: 'https://youtube.com/watch?v=vid-1',
                description: 'keep me',
                duration: 10,
                uploadDate: '20240101',
                viewCount: 1,
                categories: ['cat-a'],
                tags: ['tag-a'],
                transcript: '["line"]',
            },
        ]);

        upsertVideoInfo(channelId, [
            {
                youtubeVideoId: 'vid-1',
                title: 'Updated',
                viewCount: 99,
            },
        ]);

        const row = mockDb.prepare('SELECT * FROM videos WHERE youtube_video_id = ?').get('vid-1') as VideoRow;
        expect(row).toMatchObject({
            youtube_video_id: 'vid-1',
            title: 'Updated',
            view_count: 99,
            url: 'https://youtube.com/watch?v=vid-1',
            description: 'keep me',
            duration: 10,
            upload_date: '20240101',
            categories: '["cat-a"]',
            tags: '["tag-a"]',
            transcript: '["line"]',
        });
    });

    it('skips videos missing youtubeVideoId', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });

        const count = upsertVideoInfo(channelId, [
            {
                title: 'No identity',
            },
        ]);

        expect(count).toBe(0);
        expect(mockLoggerWarn).toHaveBeenCalledWith('Skipping video upsert with missing youtubeVideoId for channel ID: 1');
    });

    it('returns numeric ids for videos missing transcripts', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });

        upsertVideoInfo(channelId, [
            {
                youtubeVideoId: 'vid-1',
                title: 'One',
                url: 'https://youtube.com/watch?v=vid-1',
            },
            {
                youtubeVideoId: 'vid-2',
                title: 'Two',
                url: 'https://youtube.com/watch?v=vid-2',
            },
        ]);

        const firstVideo = mockDb.prepare('SELECT id FROM videos WHERE youtube_video_id = ?').get('vid-1') as { id: number };
        saveTranscriptVersion({
            videoId: firstVideo.id,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });

        const missing = getVideosMissingTranscripts(channelId);
        expect(missing).toEqual([{ id: 2 }]);
        expect(typeof missing[0]!.id).toBe('number');
    });

    it('inserts the first transcript version for a video caption source and language', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });
        upsertVideoInfo(channelId, [
            {
                youtubeVideoId: 'vid-1',
                title: 'One',
                url: 'https://youtube.com/watch?v=vid-1',
            },
        ]);
        const video = mockDb.prepare('SELECT id FROM videos WHERE youtube_video_id = ?').get('vid-1') as { id: number };

        const transcript = saveTranscriptVersion({
            videoId: video.id,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });

        expect(transcript).toMatchObject({
            transcriptId: 1,
            videoId: video.id,
            captionSource: 'manual',
            language: 'en',
            version: 1,
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });
    });

    it('returns the latest transcript version when the checksum is unchanged', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });
        upsertVideoInfo(channelId, [
            {
                youtubeVideoId: 'vid-1',
                title: 'One',
                url: 'https://youtube.com/watch?v=vid-1',
            },
        ]);
        const video = mockDb.prepare('SELECT id FROM videos WHERE youtube_video_id = ?').get('vid-1') as { id: number };

        const first = saveTranscriptVersion({
            videoId: video.id,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });
        const second = saveTranscriptVersion({
            videoId: video.id,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });

        expect(second).toEqual(first);
        expect(mockDb.prepare('SELECT COUNT(*) AS count FROM transcripts').get()).toEqual({ count: 1 });
    });

    it('inserts the next transcript version when the checksum changes', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });
        upsertVideoInfo(channelId, [
            {
                youtubeVideoId: 'vid-1',
                title: 'One',
                url: 'https://youtube.com/watch?v=vid-1',
            },
        ]);
        const video = mockDb.prepare('SELECT id FROM videos WHERE youtube_video_id = ?').get('vid-1') as { id: number };

        saveTranscriptVersion({
            videoId: video.id,
            captionSource: 'automatic',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });
        const changed = saveTranscriptVersion({
            videoId: video.id,
            captionSource: 'automatic',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[{"tStartMs":0}]}',
            checksum: 'checksum-two',
        });

        expect(changed.version).toBe(2);
        expect(findLatestTranscriptVersion({
            videoId: video.id,
            captionSource: 'automatic',
            language: 'en',
        })).toMatchObject({
            transcriptId: changed.transcriptId,
            version: 2,
            checksum: 'checksum-two',
        });
    });

    it('stores normalized transcript segments for a transcript version', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });
        upsertVideoInfo(channelId, [
            {
                youtubeVideoId: 'vid-1',
                title: 'One',
                url: 'https://youtube.com/watch?v=vid-1',
            },
        ]);
        const video = mockDb.prepare('SELECT id FROM videos WHERE youtube_video_id = ?').get('vid-1') as { id: number };
        const transcript = saveTranscriptVersion({
            videoId: video.id,
            captionSource: 'manual',
            language: 'en',
            rawFormat: 'json3',
            rawBlob: '{"events":[]}',
            checksum: 'checksum-one',
        });

        expect(saveTranscriptSegments([
            {
                transcriptId: transcript.transcriptId,
                idx: 0,
                startMs: 100,
                endMs: 900,
                text: 'Hello',
                speaker: 'speaker-a',
                confidence: 0.95,
            },
            {
                transcriptId: transcript.transcriptId,
                idx: 1,
                startMs: 900,
                endMs: 1400,
                text: 'world',
            },
        ])).toEqual({ savedCount: 2 });

        const rows = mockDb.prepare('SELECT * FROM transcript_segments ORDER BY idx').all() as TranscriptSegmentRow[];
        expect(rows).toEqual([
            {
                id: 1,
                transcript_id: transcript.transcriptId,
                idx: 0,
                start_ms: 100,
                end_ms: 900,
                text: 'Hello',
                speaker: 'speaker-a',
                confidence: 0.95,
            },
            {
                id: 2,
                transcript_id: transcript.transcriptId,
                idx: 1,
                start_ms: 900,
                end_ms: 1400,
                text: 'world',
                speaker: null,
                confidence: null,
            },
        ]);
    });

    it('keeps legacy transcript upsert compatibility on the versioned table', () => {
        const channelId = upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            url: 'https://www.youtube.com/@alpha',
        });
        upsertVideoInfo(channelId, [
            {
                youtubeVideoId: 'vid-1',
                title: 'One',
                url: 'https://youtube.com/watch?v=vid-1',
            },
        ]);
        const video = mockDb.prepare('SELECT id FROM videos WHERE youtube_video_id = ?').get('vid-1') as { id: number };

        expect(upsertTranscriptData([{ videoId: video.id, text: 'legacy transcript text' }])).toBe(1);
        expect(upsertTranscriptData([{ videoId: video.id, text: 'legacy transcript text' }])).toBe(0);

        const row = mockDb.prepare('SELECT * FROM transcripts').get() as TranscriptRow;
        expect(row).toMatchObject({
            video_id: video.id,
            caption_source: 'automatic',
            language: 'en',
            version: 1,
            raw_format: 'json3',
            raw_blob: 'legacy transcript text',
        });
    });
});
