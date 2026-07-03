import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAskText = jest.fn() as jest.MockedFunction<
    (message: string, options?: unknown) => Promise<string | undefined>
>;
const mockAskNumber = jest.fn() as jest.MockedFunction<
    (message: string, options?: unknown) => Promise<number | undefined>
>;
const mockAskConfirm = jest.fn() as jest.MockedFunction<
    (message: string, initial?: boolean) => Promise<boolean | undefined>
>;

jest.mock('../../services/prompt.service', () => ({
    askText: (...args: unknown[]) => (mockAskText as any)(...args),
    askNumber: (...args: unknown[]) => (mockAskNumber as any)(...args),
    askConfirm: (...args: unknown[]) => (mockAskConfirm as any)(...args),
}));

import {
    parseWorkflowInputs,
    promptForChannelVideosWorkflow,
    promptForFullPipelineWorkflow,
} from '../workflowPrompts';

describe('workflow prompts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('parses one file path without splitting on spaces', () => {
        expect(parseWorkflowInputs('channels with spaces.txt')).toEqual(['channels with spaces.txt']);
    });

    it('parses comma and newline separated identifiers', () => {
        expect(parseWorkflowInputs('@alpha, @beta\n@gamma')).toEqual(['@alpha', '@beta', '@gamma']);
    });

    it('maps video workflow prompts to the exact runner argument shape', async () => {
        mockAskText.mockImplementationOnce(async () => '@alpha, @beta');
        mockAskNumber
            .mockImplementationOnce(async () => 25)
            .mockImplementationOnce(async () => 5);
        mockAskConfirm
            .mockImplementationOnce(async () => true)
            .mockImplementationOnce(async () => true)
            .mockImplementationOnce(async () => true);

        await expect(promptForChannelVideosWorkflow()).resolves.toEqual({
            kind: 'submit',
            value: {
                inputs: ['@alpha', '@beta'],
                limit: 25,
                save: true,
                batch: 5,
                createChannel: true,
            },
        });
    });

    it('aborts a save-enabled workflow when the final confirmation is declined', async () => {
        mockAskText.mockImplementationOnce(async () => '@alpha');
        mockAskNumber
            .mockImplementationOnce(async () => 25)
            .mockImplementationOnce(async () => 5);
        mockAskConfirm
            .mockImplementationOnce(async () => true)
            .mockImplementationOnce(async () => false)
            .mockImplementationOnce(async () => false);

        await expect(promptForChannelVideosWorkflow()).resolves.toEqual({
            kind: 'aborted-save',
        });
    });

    it('carries the shared dry-run choice through the full pipeline prompt', async () => {
        mockAskText.mockImplementationOnce(async () => '@alpha');
        mockAskConfirm.mockImplementationOnce(async () => false);
        mockAskNumber
            .mockImplementationOnce(async () => 100)
            .mockImplementationOnce(async () => 10)
            .mockImplementationOnce(async () => 15);

        await expect(promptForFullPipelineWorkflow()).resolves.toEqual({
            kind: 'submit',
            value: {
                inputs: ['@alpha'],
                save: false,
                videoLimit: 100,
                videoBatch: 10,
                createChannel: false,
                transcriptLimit: 15,
            },
        });
    });
});
