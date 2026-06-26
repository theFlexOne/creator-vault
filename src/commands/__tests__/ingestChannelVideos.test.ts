import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockRunIngestChannelVideos = jest.fn() as jest.MockedFunction<
    (inputs: string[], limit: number, save: boolean, batch: number) => Promise<void>
>;

jest.mock('../../ingest', () => ({
    runIngestChannelVideos: (...args: unknown[]) => (mockRunIngestChannelVideos as any)(...args),
}));

import ingestChannelVideos from '../ingestChannelVideos';

describe('ingestChannelVideos command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates execution to the ingest channel videos stub', async () => {
        await ingestChannelVideos.handler({
            inputs: ['channels.txt'],
            limit: 25,
            save: true,
            batch: 5,
            _: [],
            $0: '',
        } as any);

        expect(mockRunIngestChannelVideos).toHaveBeenCalledWith(['channels.txt'], 25, true, 5);
    });
});
