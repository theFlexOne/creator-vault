import db from '../lib/sqlite/db';

export type ProfileRecord = {
    id: number;
    name: string;
};

export type ProfileTaxonomyTermRecord = {
    id: number;
    slug: string;
    label: string;
    description: string;
    parentId: number | null;
    parentSlug: string | null;
};

export type ProfileChannelRecord = {
    id: number;
    youtubeChannelId: string;
    name: string;
    handle: string;
    description: string;
    followers: number;
    sourceMetadataTags: string[];
    url: string;
};

export type ProfileDetailsRecord = {
    id: number;
    name: string;
    description: string | null;
    occupation: string | null;
    education: string | null;
    bio: string;
    taxonomyTerms: ProfileTaxonomyTermRecord[];
    channels: ProfileChannelRecord[];
};

type ProfileDetailsRow = Omit<ProfileDetailsRecord, 'taxonomyTerms' | 'channels'>;

type ProfileChannelRow = Omit<ProfileChannelRecord, 'sourceMetadataTags'> & {
    sourceMetadataTags: string;
};

const upsertProfileByName = db.prepare(`
    INSERT INTO profiles (name)
    VALUES (@name)
    ON CONFLICT(name) DO UPDATE SET
        name = excluded.name
    RETURNING id, name
`);

const findProfileById = db.prepare(`
    SELECT
        p.id,
        p.name,
        p.description,
        p.occupation,
        p.education,
        COALESCE(pb.bio, '') AS bio
    FROM profiles p
    LEFT JOIN profile_bios pb ON pb.profile_id = p.id
    WHERE p.id = ?
    LIMIT 1
`);

const findProfileByName = db.prepare(`
    SELECT
        p.id,
        p.name,
        p.description,
        p.occupation,
        p.education,
        COALESCE(pb.bio, '') AS bio
    FROM profiles p
    LEFT JOIN profile_bios pb ON pb.profile_id = p.id
    WHERE p.name = ?
    LIMIT 1
`);

const listChannelsByProfileId = db.prepare(`
    SELECT
        id,
        youtube_channel_id AS youtubeChannelId,
        name,
        handle,
        description,
        followers,
        source_metadata_tags AS sourceMetadataTags,
        url
    FROM channels
    WHERE profile_id = ?
    ORDER BY name
`);

const listTaxonomyTermsByProfileId = db.prepare(`
    SELECT
        t.id,
        t.slug,
        t.label,
        t.description,
        t.parent_id AS parentId,
        parent.slug AS parentSlug
    FROM taxonomy_terms t
    INNER JOIN profile_taxonomy_terms ptt ON ptt.tag_id = t.id
    LEFT JOIN taxonomy_terms parent ON parent.id = t.parent_id
    WHERE ptt.profile_id = ?
    ORDER BY t.slug
`);

function parseStringArray(raw: string): string[] {
    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')
            ? parsed
            : [];
    } catch {
        return [];
    }
}

function resolveProfileDetailsRow(identifier: string): ProfileDetailsRow | undefined {
    const trimmed = identifier.trim();

    if (!trimmed) {
        throw new Error('Profile identifier is required.');
    }

    if (/^\d+$/.test(trimmed)) {
        const byId = findProfileById.get(Number(trimmed)) as ProfileDetailsRow | undefined;
        if (byId) {
            return byId;
        }
    }

    return findProfileByName.get(trimmed) as ProfileDetailsRow | undefined;
}

export function findOrCreateProfileByName(name: string): ProfileRecord {
    if (!name.trim()) {
        throw new Error('Cannot create or reuse profile without name.');
    }

    const profile = upsertProfileByName.get({ name }) as ProfileRecord | undefined;

    if (!profile) {
        throw new Error(`Failed to create or reuse profile "${name}".`);
    }

    return profile;
}

export function findProfileByIdentifier(identifier: string): ProfileRecord | undefined {
    const profile = resolveProfileDetailsRow(identifier);

    return profile
        ? {
            id: profile.id,
            name: profile.name,
        }
        : undefined;
}

export function getProfileDetails(identifier: string): ProfileDetailsRecord | undefined {
    const profile = resolveProfileDetailsRow(identifier);

    if (!profile) {
        return undefined;
    }

    const channels = (listChannelsByProfileId.all(profile.id) as ProfileChannelRow[])
        .map((channel) => ({
            ...channel,
            sourceMetadataTags: parseStringArray(channel.sourceMetadataTags),
        }));

    const taxonomyTerms = listTaxonomyTermsByProfileId.all(profile.id) as ProfileTaxonomyTermRecord[];

    return {
        ...profile,
        channels,
        taxonomyTerms,
    };
}