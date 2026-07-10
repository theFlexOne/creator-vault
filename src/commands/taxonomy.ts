import { CommandModule } from 'yargs';
import {
    runAssignProfileTerm,
    runCreateTaxonomyTerm,
    runListTaxonomyTerms,
    runRemoveProfileTerm,
} from '../services/taxonomy.service';

const taxonomy: CommandModule = {
    command: 'taxonomy <command>',
    describe: 'Manage curated taxonomy terms and profile assignments.',
    builder: (yargs) => yargs
        .command({
            command: 'create-term <slug> <label>',
            describe: 'Create or update a taxonomy term.',
            builder: (inner) => inner
                .positional('slug', {
                    describe: 'Unique taxonomy slug',
                    type: 'string',
                    demandOption: true,
                })
                .positional('label', {
                    describe: 'Display label for the taxonomy term',
                    type: 'string',
                    demandOption: true,
                })
                .option('description', {
                    describe: 'Optional taxonomy term description',
                    type: 'string',
                    default: '',
                })
                .option('parent', {
                    describe: 'Optional parent taxonomy slug',
                    type: 'string',
                }),
            handler: async (argv) => {
                const result = runCreateTaxonomyTerm({
                    slug: String(argv.slug),
                    label: String(argv.label),
                    description: typeof argv.description === 'string' ? argv.description : '',
                    parentSlug: typeof argv.parent === 'string' ? argv.parent : undefined,
                });
                console.log(JSON.stringify(result, null, 2));
            },
        })
        .command({
            command: 'list-terms',
            describe: 'List taxonomy terms.',
            handler: async () => {
                const result = runListTaxonomyTerms();
                console.log(JSON.stringify(result, null, 2));
            },
        })
        .command({
            command: 'assign-profile-term <profile> <term>',
            describe: 'Assign a taxonomy term to a profile.',
            builder: (inner) => inner
                .positional('profile', {
                    describe: 'Profile name or id',
                    type: 'string',
                    demandOption: true,
                })
                .positional('term', {
                    describe: 'Taxonomy term slug or id',
                    type: 'string',
                    demandOption: true,
                }),
            handler: async (argv) => {
                const result = runAssignProfileTerm(String(argv.profile), String(argv.term));
                console.log(JSON.stringify(result, null, 2));
            },
        })
        .command({
            command: 'remove-profile-term <profile> <term>',
            describe: 'Remove a taxonomy term from a profile.',
            builder: (inner) => inner
                .positional('profile', {
                    describe: 'Profile name or id',
                    type: 'string',
                    demandOption: true,
                })
                .positional('term', {
                    describe: 'Taxonomy term slug or id',
                    type: 'string',
                    demandOption: true,
                }),
            handler: async (argv) => {
                const result = runRemoveProfileTerm(String(argv.profile), String(argv.term));
                console.log(JSON.stringify(result, null, 2));
            },
        })
        .demandCommand(1)
        .strict(),
    handler: () => undefined,
};

export default taxonomy;