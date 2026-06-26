import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockRunIngestChannelProfile = jest.fn() as jest.MockedFunction<(inputs: string[], save: boolean) => Promise<void>>;

jest.mock('../../ingest', () => ({
    runIngestChannelProfile: (...args: unknown[]) => (mockRunIngestChannelProfile as any)(...args),
}));

import ingestChannelProfile from '../ingestChannelProfile';

describe('ingestChannelProfile command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('delegates execution to the ingest channel profile stub', async () => {
        await ingestChannelProfile.handler({ inputs: ['channels.txt'], save: false, _: [], $0: '' } as any);

        expect(mockRunIngestChannelProfile).toHaveBeenCalledWith(['channels.txt'], false);
    });
});
