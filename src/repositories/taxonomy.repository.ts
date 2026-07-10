import db from '../lib/sqlite/db';
import { findProfileByIdentifier } from './profile.repository';

export type TaxonomyTermRecord = {
    id: number;
    slug: string;
    label: string;
    description: string;
    parentId: number | null;
    parentSlug: string | null;
};

export type UpsertTaxonomyTermInput = {
    slug: string;
    label: string;
    description?: string;
    parentSlug?: string;
};

export type ProfileTaxonomyAssignmentRecord = {
    profileId: number;
    profileName: string;
    termId: number;
    termSlug: string;
    termLabel: string;
};

type TaxonomyTermRow = Omit<TaxonomyTermRecord, 'parentSlug'>;

const findTaxonomyTermById = db.prepare(`
    SELECT
        t.id,
        t.slug,
        t.label,
        t.description,
        t.parent_id AS parentId,
        parent.slug AS parentSlug
    FROM taxonomy_terms t
    LEFT JOIN taxonomy_terms parent ON parent.id = t.parent_id
    WHERE t.id = ?
    LIMIT 1
`);

const findTaxonomyTermBySlug = db.prepare(`
    SELECT
        t.id,
        t.slug,
        t.label,
        t.description,
        t.parent_id AS parentId,
        parent.slug AS parentSlug
    FROM taxonomy_terms t
    LEFT JOIN taxonomy_terms parent ON parent.id = t.parent_id
    WHERE t.slug = ?
    LIMIT 1
`);

const listAllTaxonomyTerms = db.prepare(`
    SELECT
        t.id,
        t.slug,
        t.label,
        t.description,
        t.parent_id AS parentId,
        parent.slug AS parentSlug
    FROM taxonomy_terms t
    LEFT JOIN taxonomy_terms parent ON parent.id = t.parent_id
    ORDER BY t.slug
`);

const upsertTaxonomyTermStatement = db.prepare(`
    INSERT INTO taxonomy_terms (
        slug,
        label,
        description,
        parent_id
    )
    VALUES (
        @slug,
        @label,
        COALESCE(@description, ''),
        @parent_id
    )
    ON CONFLICT(slug) DO UPDATE SET
        label = excluded.label,
        description = excluded.description,
        parent_id = excluded.parent_id
    RETURNING id, slug, label, description, parent_id AS parentId
`);

const insertProfileTaxonomyTerm = db.prepare(`
    INSERT INTO profile_taxonomy_terms (profile_id, tag_id)
    VALUES (?, ?)
    ON CONFLICT(profile_id, tag_id) DO NOTHING
`);

const deleteProfileTaxonomyTerm = db.prepare(`
    DELETE FROM profile_taxonomy_terms
    WHERE profile_id = ? AND tag_id = ?
`);

function resolveTaxonomyTerm(identifier: string): TaxonomyTermRecord | undefined {
    const trimmed = identifier.trim();

    if (!trimmed) {
        throw new Error('Taxonomy term identifier is required.');
    }

    if (/^\d+$/.test(trimmed)) {
        const byId = findTaxonomyTermById.get(Number(trimmed)) as TaxonomyTermRecord | undefined;
        if (byId) {
            return byId;
        }
    }

    return findTaxonomyTermBySlug.get(trimmed) as TaxonomyTermRecord | undefined;
}

export function upsertTaxonomyTerm(input: UpsertTaxonomyTermInput): TaxonomyTermRecord {
    const slug = input.slug.trim();
    const label = input.label.trim();

    if (!slug) {
        throw new Error('Taxonomy term slug is required.');
    }

    if (!label) {
        throw new Error('Taxonomy term label is required.');
    }

    const parentSlug = input.parentSlug?.trim();
    const parentTerm = parentSlug ? resolveTaxonomyTerm(parentSlug) : undefined;

    if (parentSlug && !parentTerm) {
        throw new Error(`Parent taxonomy term "${parentSlug}" not found.`);
    }

    if (parentTerm?.slug === slug) {
        throw new Error('A taxonomy term cannot be its own parent.');
    }

    const saved = upsertTaxonomyTermStatement.get({
        slug,
        label,
        description: input.description?.trim() ?? '',
        parent_id: parentTerm?.id ?? null,
    }) as TaxonomyTermRow | undefined;

    if (!saved) {
        throw new Error(`Failed to create or update taxonomy term "${slug}".`);
    }

    return {
        ...saved,
        parentSlug: parentTerm?.slug ?? null,
    };
}

export function listTaxonomyTerms(): TaxonomyTermRecord[] {
    return listAllTaxonomyTerms.all() as TaxonomyTermRecord[];
}

export function assignTaxonomyTermToProfile(
    profileIdentifier: string,
    termIdentifier: string,
): ProfileTaxonomyAssignmentRecord {
    const profile = findProfileByIdentifier(profileIdentifier);

    if (!profile) {
        throw new Error(`Profile "${profileIdentifier}" not found.`);
    }

    const term = resolveTaxonomyTerm(termIdentifier);

    if (!term) {
        throw new Error(`Taxonomy term "${termIdentifier}" not found.`);
    }

    insertProfileTaxonomyTerm.run(profile.id, term.id);

    return {
        profileId: profile.id,
        profileName: profile.name,
        termId: term.id,
        termSlug: term.slug,
        termLabel: term.label,
    };
}

export function removeTaxonomyTermFromProfile(
    profileIdentifier: string,
    termIdentifier: string,
): ProfileTaxonomyAssignmentRecord & { removed: boolean } {
    const profile = findProfileByIdentifier(profileIdentifier);

    if (!profile) {
        throw new Error(`Profile "${profileIdentifier}" not found.`);
    }

    const term = resolveTaxonomyTerm(termIdentifier);

    if (!term) {
        throw new Error(`Taxonomy term "${termIdentifier}" not found.`);
    }

    const result = deleteProfileTaxonomyTerm.run(profile.id, term.id);

    return {
        profileId: profile.id,
        profileName: profile.name,
        termId: term.id,
        termSlug: term.slug,
        termLabel: term.label,
        removed: result.changes > 0,
    };
}