import {
    assignTaxonomyTermToProfile,
    listTaxonomyTerms,
    removeTaxonomyTermFromProfile,
    upsertTaxonomyTerm,
    type ProfileTaxonomyAssignmentRecord,
    type TaxonomyTermRecord,
    type UpsertTaxonomyTermInput,
} from '../repositories/taxonomy.repository';

export function runCreateTaxonomyTerm(input: UpsertTaxonomyTermInput): TaxonomyTermRecord {
    return upsertTaxonomyTerm(input);
}

export function runListTaxonomyTerms(): TaxonomyTermRecord[] {
    return listTaxonomyTerms();
}

export function runAssignProfileTerm(
    profileIdentifier: string,
    termIdentifier: string,
): ProfileTaxonomyAssignmentRecord {
    return assignTaxonomyTermToProfile(profileIdentifier, termIdentifier);
}

export function runRemoveProfileTerm(
    profileIdentifier: string,
    termIdentifier: string,
): ProfileTaxonomyAssignmentRecord & { removed: boolean } {
    return removeTaxonomyTermFromProfile(profileIdentifier, termIdentifier);
}