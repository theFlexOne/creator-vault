import { describe, expect, it } from '@jest/globals';

import getChannelTranscripts from '../getChannelTranscripts';

describe('getChannelTranscripts', () => {
    it('keeps the legacy compatibility shape for requested video ids', async () => {
        await expect(getChannelTranscripts([1, 2, 3])).resolves.toEqual([
            { videoId: 1, text: '' },
            { videoId: 2, text: '' },
            { videoId: 3, text: '' },
        ]);
    });
});
