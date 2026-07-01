import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockDbGet = jest.fn();
const mockDbPrepare = jest.fn(() => ({
    get: mockDbGet,
})) as jest.MockedFunction<(sql: string) => { get: typeof mockDbGet }>;
const mockYoutubeDl = jest.fn() as jest.MockedFunction<
    (input: string, options?: Record<string, unknown>) => Promise<unknown>
>;
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../lib/sqlite/db', () => ({
    __esModule: true,
    default: {
        prepare: (sql: string) => mockDbPrepare(sql),
    },
}));

jest.mock('youtube-dl-exec', () => ({
    __esModule: true,
    default: (...args: unknown[]) => (mockYoutubeDl as any)(...args),
}));

jest.mock('../../shared/logger', () => ({
    logger: {
        info: (...args: unknown[]) => mockLoggerInfo(...args),
        warn: (...args: unknown[]) => mockLoggerWarn(...args),
        error: (...args: unknown[]) => mockLoggerError(...args),
    },
}));

import { runTestConnection } from '../testConnection.service';

describe('runTestConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDbPrepare.mockReturnValue({ get: mockDbGet });
        mockDbGet.mockReturnValue({ connected: 1 });
        mockYoutubeDl.mockResolvedValueOnce('2026.07.01\n').mockResolvedValueOnce({ id: 'video' });
    });

    it('logs successful database, downloader, network, and completion diagnostics', async () => {
        await runTestConnection();

        expect(mockDbPrepare).toHaveBeenCalledWith('SELECT 1 as connected');
        expect(mockYoutubeDl).toHaveBeenNthCalledWith(1, '--version');
        expect(mockYoutubeDl).toHaveBeenNthCalledWith(2, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
            dumpSingleJson: true,
            noWarnings: true,
            simulate: true,
        });
        expect(mockLoggerInfo).toHaveBeenCalledWith('Running diagnostic tests...');
        expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Database: Connected successfully.'));
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            expect.stringContaining('YouTube downloader: Executable found (Version: 2026.07.01).'),
        );
        expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Network: Successfully reached YouTube.'));
        expect(mockLoggerInfo).toHaveBeenCalledWith('Diagnostics complete.');
        expect(mockLoggerWarn).not.toHaveBeenCalled();
        expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('logs database failures and continues through later diagnostics', async () => {
        mockDbPrepare.mockImplementation(() => {
            throw new Error('database unavailable');
        });

        await runTestConnection();

        expect(mockLoggerError).toHaveBeenCalledWith(
            expect.stringContaining('Database: Connection failed. Error: database unavailable'),
        );
        expect(mockYoutubeDl).toHaveBeenCalledTimes(2);
        expect(mockLoggerInfo).toHaveBeenCalledWith(
            expect.stringContaining('YouTube downloader: Executable found (Version: 2026.07.01).'),
        );
        expect(mockLoggerInfo).toHaveBeenCalledWith('Diagnostics complete.');
    });

    it('logs downloader failures and still checks YouTube network access', async () => {
        mockYoutubeDl.mockReset();
        mockYoutubeDl.mockRejectedValueOnce(new Error('missing executable')).mockResolvedValueOnce({ id: 'video' });

        await runTestConnection();

        expect(mockLoggerError).toHaveBeenCalledWith(
            expect.stringContaining('YouTube downloader: Executable not found or failed. Error: missing executable'),
        );
        expect(mockYoutubeDl).toHaveBeenNthCalledWith(2, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
            dumpSingleJson: true,
            noWarnings: true,
            simulate: true,
        });
        expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining('Network: Successfully reached YouTube.'));
        expect(mockLoggerInfo).toHaveBeenCalledWith('Diagnostics complete.');
    });

    it('logs a network warning without failing diagnostics', async () => {
        mockYoutubeDl.mockReset();
        mockYoutubeDl.mockResolvedValueOnce('2026.07.01\n').mockRejectedValueOnce(new Error('network blocked'));

        await runTestConnection();

        expect(mockLoggerInfo).toHaveBeenCalledWith(
            expect.stringContaining('YouTube downloader: Executable found (Version: 2026.07.01).'),
        );
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            expect.stringContaining(
                'Network: Failed to reach YouTube (this might be expected in some environments). Error: network blocked',
            ),
        );
        expect(mockLoggerInfo).toHaveBeenCalledWith('Diagnostics complete.');
    });
});
