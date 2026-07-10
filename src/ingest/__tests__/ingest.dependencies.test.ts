import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { createSchemaBackedTestDb } from '../../test-support/createSchemaBackedTestDb';

const mockDb = createSchemaBackedTestDb();

jest.mock('../../lib/sqlite/db', () => ({
    __esModule: true,
    default: mockDb,
}));

import { createDefaultFutureIngestDependencies } from '../ingest.dependencies';

describe('createDefaultFutureIngestDependencies', () => {
    afterAll(() => {
        mockDb.close();
    });

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
