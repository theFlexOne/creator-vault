import Database from 'better-sqlite3';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

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
        id TEXT PRIMARY KEY,
        channel_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        duration INTEGER NOT NULL DEFAULT 0,
        upload_date TEXT,
        view_count INTEGER NOT NULL DEFAULT 0,
        categories TEXT NOT NULL DEFAULT '[]',
        tags TEXT NOT NULL DEFAULT '[]',
        transcript TEXT NOT NULL DEFAULT '[]'
    );
`);

jest.mock('../../db', () => ({
    db: mockDb,
}));

jest.mock('../../logger', () => ({
    logger: {
        info: (...args: unknown[]) => mockLoggerInfo(...args),
        warn: (...args: unknown[]) => mockLoggerWarn(...args),
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

import { upsertChannelInfo } from '../db.service';

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

describe('upsertChannelData', () => {
    beforeEach(() => {
        mockDb.exec('DELETE FROM channels;');
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
});