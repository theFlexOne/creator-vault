import { CommandModule } from 'yargs';
import { runShowProfile } from '../services/profile.service';

const profile: CommandModule = {
    command: 'profile <command>',
    describe: 'Inspect profile records and taxonomy assignments.',
    builder: (yargs) => yargs
        .command({
            command: 'show <identifier>',
            describe: 'Show a profile with taxonomy terms and channel metadata.',
            builder: (inner) => inner.positional('identifier', {
                describe: 'Profile name or id',
                type: 'string',
                demandOption: true,
            }),
            handler: async (argv) => {
                const result = runShowProfile(String(argv.identifier));
                console.log(JSON.stringify(result, null, 2));
            },
        })
        .demandCommand(1)
        .strict(),
    handler: () => undefined,
};

export default profile;