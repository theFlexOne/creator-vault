import db from '../lib/sqlite/db';

export type CreatorRecord = {
    id: number;
    name: string;
};

const upsertCreatorByName = db.prepare(`
    INSERT INTO creators (name)
    VALUES (@name)
    ON CONFLICT(name) DO UPDATE SET
        name = excluded.name
    RETURNING id, name
`);

export function findOrCreateCreatorByName(name: string): CreatorRecord {
    if (!name.trim()) {
        throw new Error('Cannot create or reuse creator without name.');
    }

    const creator = upsertCreatorByName.get({ name }) as CreatorRecord | undefined;

    if (!creator) {
        throw new Error(`Failed to create or reuse creator "${name}".`);
    }

    return creator;
}
