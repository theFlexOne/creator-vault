import { CommandModule } from 'yargs';
import { runUiShell } from '../ui/shell';

const ui: CommandModule = {
    command: 'ui',
    describe: 'Launch the guided interactive terminal shell.',
    handler: async () => {
        await runUiShell();
    },
};

export default ui;
