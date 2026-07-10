import { getProfileDetails, type ProfileDetailsRecord } from '../repositories/profile.repository';

export function runShowProfile(identifier: string): ProfileDetailsRecord {
    const profile = getProfileDetails(identifier);

    if (!profile) {
        throw new Error(`Profile "${identifier}" not found.`);
    }

    return profile;
}