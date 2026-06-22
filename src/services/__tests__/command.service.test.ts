import { resolveIdentifiers } from '../command.service';
import fs from 'fs';

jest.mock('fs');
const mockedFs = jest.mocked(fs);

describe('resolveIdentifiers', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return multiple inputs as-is without checking the filesystem', async () => {
        const inputs = ['https://youtube.com/c/1', 'https://youtube.com/c/2'];
        const result = await resolveIdentifiers(inputs);
        expect(result).toEqual(inputs);
        expect(mockedFs.existsSync).not.toHaveBeenCalled();
    });

    it('should return a single input as-is if no file exists at that path', async () => {
        mockedFs.existsSync.mockReturnValue(false);
        const inputs = ['@handle1'];
        const result = await resolveIdentifiers(inputs);
        expect(result).toEqual(inputs);
    });

    it('should auto-detect and parse a plain text file when a single file path is given', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(' @handle1 \n@handle2\n\n@handle3   ');
        
        const result = await resolveIdentifiers(['channels.txt']);
        expect(result).toEqual(['@handle1', '@handle2', '@handle3']);
    });

    it('should auto-detect and parse a JSON array file when a single file path is given', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(['@handleA', '@handleB']));
        
        const result = await resolveIdentifiers(['channels.json']);
        expect(result).toEqual(['@handleA', '@handleB']);
    });

    it('should auto-detect and parse christian_yt_channel_list JSON format when a single file path is given', async () => {
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify({
            channels: [
                { name: 'A', link: 'https://youtube.com/@A' },
                { name: 'B', handle: '@B' },
                { name: 'C' } // No link or handle
            ]
        }));
        
        const result = await resolveIdentifiers(['docs/christian_yt_channel_list.json']);
        expect(result).toEqual(['https://youtube.com/@A', '@B']);
    });
});
