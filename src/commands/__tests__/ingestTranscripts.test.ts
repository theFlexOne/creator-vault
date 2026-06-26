import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockRunIngestTranscripts = jest.fn() as jest.MockedFunction<
    (inputs: string[], limit: number, save: boolean) => Promise<void>
>;

jest.mock('../../ingest', () => ({
    runIngestTranscripts: (...args: unknown[]) => (mockRunIngestTranscripts as any)(...args),
}));

import ingestTranscripts from '../ingestTranscripts';

describe('ingestTranscripts command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates execution to the ingest transcripts compatibility service', async () => {
        await ingestTranscripts.handler({
            inputs: ['channels.txt'],
            limit: 10,
            save: true,
            _: [],
            $0: '',
        } as any);

        expect(mockRunIngestTranscripts).toHaveBeenCalledWith(['channels.txt'], 10, true);
    });
});
