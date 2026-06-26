import { resolveCliInputIdentifiers } from '../input';
import fs from 'fs';

jest.mock('fs');
const mockedFs = jest.mocked(fs);

describe('resolveCliInputIdentifiers', () => {
    afterEach(() => {
        jest.clearAllMocks();
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
});
