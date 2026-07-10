import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createSchemaBackedTestDb, resetSchemaBackedTestDb } from '../../test-support/createSchemaBackedTestDb';

const mockDb = createSchemaBackedTestDb();

jest.mock('../../lib/sqlite/db', () => ({
    __esModule: true,
    default: mockDb,
}));

import { upsertChannelInfo } from '../../repositories/channel.repository';
import { findOrCreateProfileByName } from '../../repositories/profile.repository';
import { runShowProfile } from '../profile.service';
import {
    runAssignProfileTerm,
    runCreateTaxonomyTerm,
    runListTaxonomyTerms,
    runRemoveProfileTerm,
} from '../taxonomy.service';

describe('taxonomy and profile services', () => {
    beforeEach(() => {
        resetSchemaBackedTestDb(mockDb);
    });

    afterAll(() => {
        mockDb.close();
    });

    it('creates and lists taxonomy terms with optional parents', () => {
        const root = runCreateTaxonomyTerm({
            slug: 'apologetics',
            label: 'Apologetics',
            description: 'Primary apologetics bucket',
        });
        const child = runCreateTaxonomyTerm({
            slug: 'presuppositional',
            label: 'Presuppositional',
            parentSlug: 'apologetics',
        });

        expect(root).toMatchObject({
            slug: 'apologetics',
            label: 'Apologetics',
            parentId: null,
            parentSlug: null,
        });
        expect(child).toMatchObject({
            slug: 'presuppositional',
            label: 'Presuppositional',
            parentSlug: 'apologetics',
        });
        expect(runListTaxonomyTerms()).toEqual([
            expect.objectContaining({ slug: 'apologetics', label: 'Apologetics', parentSlug: null }),
            expect.objectContaining({ slug: 'presuppositional', label: 'Presuppositional', parentSlug: 'apologetics' }),
        ]);
    });

    it('assigns and removes taxonomy terms from profiles', () => {
        findOrCreateProfileByName('Alpha');
        runCreateTaxonomyTerm({ slug: 'theology', label: 'Theology' });

        expect(runAssignProfileTerm('Alpha', 'theology')).toEqual({
            profileId: 1,
            profileName: 'Alpha',
            termId: 1,
            termSlug: 'theology',
            termLabel: 'Theology',
        });
        expect(runRemoveProfileTerm('Alpha', 'theology')).toEqual({
            profileId: 1,
            profileName: 'Alpha',
            termId: 1,
            termSlug: 'theology',
            termLabel: 'Theology',
            removed: true,
        });
        expect(runRemoveProfileTerm('Alpha', 'theology')).toEqual({
            profileId: 1,
            profileName: 'Alpha',
            termId: 1,
            termSlug: 'theology',
            termLabel: 'Theology',
            removed: false,
        });
    });

    it('shows a profile with taxonomy terms separate from source metadata tags', () => {
        runCreateTaxonomyTerm({ slug: 'discernment', label: 'Discernment' });
        upsertChannelInfo({
            youtubeChannelId: 'UC123',
            name: 'Alpha',
            handle: '@alpha',
            description: 'Alpha description',
            followers: 12,
            tags: ['news', 'updates'],
            url: 'https://www.youtube.com/@alpha',
        });
        runAssignProfileTerm('Alpha', 'discernment');

        expect(runShowProfile('Alpha')).toEqual({
            id: 1,
            name: 'Alpha',
            description: null,
            occupation: null,
            education: null,
            bio: '',
            taxonomyTerms: [
                {
                    id: 1,
                    slug: 'discernment',
                    label: 'Discernment',
                    description: '',
                    parentId: null,
                    parentSlug: null,
                },
            ],
            channels: [
                {
                    id: 1,
                    youtubeChannelId: 'UC123',
                    name: 'Alpha',
                    handle: '@alpha',
                    description: 'Alpha description',
                    followers: 12,
                    sourceMetadataTags: ['news', 'updates'],
                    url: 'https://www.youtube.com/@alpha',
                },
            ],
        });
    });

    it('fails when the requested profile does not exist', () => {
        expect(() => runShowProfile('Missing')).toThrow('Profile "Missing" not found.');
    });
});