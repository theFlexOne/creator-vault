import { describe, expect, it } from '@jest/globals';
import { createProductionYoutubeSourceStub } from '../youtubeSource';

describe('createProductionYoutubeSourceStub', () => {
    it('returns a placeholder channel videos page for future chunked video ingestion', async () => {
        const source = createProductionYoutubeSourceStub();

        await expect(
            source.fetchChannelVideosPage('@alpha', { playlistStart: 1, playlistEnd: 10 }),
        ).resolves.toEqual({
            channelInput: '@alpha',
            pageRange: { playlistStart: 1, playlistEnd: 10 },
            videoUrls: [],
        });
    });

    it('throws for channel profile retrieval until the production source is wired', async () => {
        const source = createProductionYoutubeSourceStub();

        await expect(source.fetchChannelProfile('@alpha')).rejects.toThrow(
            'TODO: wire production YouTube source for channel profile retrieval',
        );
    });

    it('throws for json3 caption download until the production source is wired', async () => {
        const source = createProductionYoutubeSourceStub();

        await expect(
            source.downloadJson3Captions([{ videoId: 'abc123', language: 'en', preferManual: true }], '/tmp/captions'),
        ).rejects.toThrow('TODO: wire production YouTube source for json3 caption download');
    });
});
