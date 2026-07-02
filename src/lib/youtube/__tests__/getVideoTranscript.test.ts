import { describe, expect, it } from '@jest/globals';

import getVideoTranscript from '../getVideoTranscript';

describe('getVideoTranscript', () => {
    it('keeps the legacy compatibility contract of resolving an empty transcript string', async () => {
        await expect(getVideoTranscript()).resolves.toBe('');
    });
});
