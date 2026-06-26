import { describe, expect, it } from '@jest/globals';
import { createDefaultFutureIngestDependencies } from '../ingest.dependencies';

describe('createDefaultFutureIngestDependencies', () => {
    it('wires default future ingest dependencies without invoking production stubs', async () => {
        const dependencies = createDefaultFutureIngestDependencies();

        expect(await dependencies.inputLoader.resolveIdentifiers(['@alpha'])).toEqual(['@alpha']);
        expect(dependencies.tempDirectoryProvider.getTempDirectory()).toEqual(expect.any(String));
        expect(dependencies.youtubeSource).toBeDefined();
        expect(dependencies.storage).toBeDefined();
        expect(dependencies.reporter).toEqual(
            expect.objectContaining({
                info: expect.any(Function),
                warn: expect.any(Function),
                error: expect.any(Function),
            }),
        );
    });
});
