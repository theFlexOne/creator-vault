import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAskSelect = jest.fn() as jest.MockedFunction<
    (message: string, options: unknown[]) => Promise<string | undefined>
>;
const mockRunUiAction = jest.fn() as jest.MockedFunction<
    (action: string, output: unknown) => Promise<void>
>;

jest.mock('../../services/prompt.service', () => ({
    askSelect: (message: string, options: unknown[]) => mockAskSelect(message, options),
}));

jest.mock('../workflows', () => ({
    runUiAction: (action: string, output: unknown) => mockRunUiAction(action, output),
}));

import { uiMenuOptions } from '../menu';
import { runUiShell } from '../shell';

describe('runUiShell', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('exits immediately when the user cancels the menu', async () => {
        mockAskSelect.mockImplementationOnce(async () => undefined);
        const output = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

        await runUiShell(output);

        expect(mockAskSelect).toHaveBeenCalledWith('Choose a workflow', uiMenuOptions);
        expect(output.log).not.toHaveBeenCalled();
    });

    it('exits when the user selects exit', async () => {
        mockAskSelect.mockImplementationOnce(async () => 'exit');
        const output = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

        await runUiShell(output);

        expect(output.log).toHaveBeenCalledWith('Exiting Creator Vault UI.');
    });

    it('routes a selected action into the workflow runner before returning to the menu', async () => {
        mockAskSelect
            .mockImplementationOnce(async () => 'ingest-channel-videos')
            .mockImplementationOnce(async () => 'exit');
        const output = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

        await runUiShell(output);

        expect(mockRunUiAction).toHaveBeenCalledWith('ingest-channel-videos', output);
        expect(output.log).toHaveBeenCalledWith('Exiting Creator Vault UI.');
        expect(mockAskSelect).toHaveBeenCalledTimes(2);
    });
});
