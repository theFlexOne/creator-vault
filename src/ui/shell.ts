import { promptForUiAction } from './menu';
import { runUiAction } from './workflows';

type UiShellOutput = Pick<Console, 'log' | 'warn' | 'error'>;

export async function runUiShell(output: UiShellOutput = console): Promise<void> {
    while (true) {
        const action = await promptForUiAction();

        if (action === undefined) {
            return;
        }

        if (action === 'exit') {
            output.log('Exiting Creator Vault UI.');
            return;
        }

        await runUiAction(action, output);
    }
}
