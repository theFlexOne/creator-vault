import fs from 'fs';
import { logger } from '../../shared/logger';
import { resolveCliInputIdentifiers } from '../input';

jest.mock('fs');
jest.mock('../../shared/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

const mockedFs = jest.mocked(fs);
const mockLoggerError = jest.mocked(logger.error);

describe('resolveCliInputIdentifiers', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns an empty input list as-is without checking the filesystem', async () => {
        await expect(resolveCliInputIdentifiers([])).resolves.toEqual([]);

        expect(mockedFs.existsSync).not.toHaveBeenCalled();
    });

    it('returns multiple inputs as-is without checking the filesystem', async () => {
        const inputs = ['https://youtube.com/c/1', 'https://youtube.com/c/2'];

        await expect(resolveCliInputIdentifiers(inputs)).resolves.toEqual(inputs);

        expect(mockedFs.existsSync).not.toHaveBeenCalled();
    });

    it('returns a single input as-is if no file exists at that path', async () => {
        mockedFs.existsSync.mockReturnValue(false);
        const inputs = ['@handle1'];

        await expect(resolveCliInputIdentifiers(inputs)).resolves.toEqual(inputs);
    });

    it('auto-detects and parses a plain text file when a single file path is given', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(' @handle1 \n@handle2\n\n@handle3   ');

        await expect(resolveCliInputIdentifiers(['channels.txt'])).resolves.toEqual([
            '@handle1',
            '@handle2',
            '@handle3',
        ]);
    });

    it('returns an empty list for an empty file', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue('  \n\n');

        await expect(resolveCliInputIdentifiers(['channels.txt'])).resolves.toEqual([]);
    });

    it('auto-detects and parses a JSON array file when a single file path is given', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(['@handleA', '@handleB']));

        await expect(resolveCliInputIdentifiers(['channels.json'])).resolves.toEqual(['@handleA', '@handleB']);
    });

    it('auto-detects and parses channel-list JSON input when a single file path is given', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify({
            channels: [
                { name: 'A', link: 'https://youtube.com/@A' },
                { name: 'B', handle: '@B' },
                { name: 'C' },
            ],
        }));

        await expect(resolveCliInputIdentifiers(['docs/christian_yt_channel_list.json'])).resolves.toEqual([
            'https://youtube.com/@A',
            '@B',
        ]);
    });

    it('returns an empty list when JSON input is malformed', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue('{not valid json');

        await expect(resolveCliInputIdentifiers(['channels.json'])).resolves.toEqual([]);
    });

    it('falls back to line splitting for unsupported JSON object shapes', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify({ links: ['@handleA'] }));

        await expect(resolveCliInputIdentifiers(['channels.json'])).resolves.toEqual([
            '{"links":["@handleA"]}',
        ]);
    });

    it('returns an empty list and logs when file reading fails', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockImplementation(() => {
            throw new Error('disk failed');
        });

        await expect(resolveCliInputIdentifiers(['channels.txt'])).resolves.toEqual([]);

        expect(mockLoggerError).toHaveBeenCalledWith(
            expect.stringContaining('Error reading file channels.txt: Error: disk failed'),
        );
    });
});
