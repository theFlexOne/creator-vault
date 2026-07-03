import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { runUiTask } from '../runTask';

describe('runUiTask', () => {
    const output = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    const loggerTarget = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    const statusRenderer = {
        update: jest.fn(),
        done: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('captures logger output while the workflow runs', async () => {
        const result = await runUiTask({
            title: 'Example Task',
            output,
            loggerTarget,
            createStatusRenderer: () => statusRenderer,
            run: async () => {
                loggerTarget.info('one');
                loggerTarget.warn('two');
                loggerTarget.error('three');
                return { ok: true };
            },
        });

        expect(result.ok).toBe(true);
        expect(result.warningCount).toBe(1);
        expect(result.errorCount).toBe(1);
        expect(output.log).toHaveBeenCalled();
        expect(output.warn).toHaveBeenCalled();
        expect(output.error).toHaveBeenCalled();
        expect(statusRenderer.done).toHaveBeenCalled();
    });

    it('returns a failure result when the workflow throws', async () => {
        const result = await runUiTask({
            title: 'Broken Task',
            output,
            loggerTarget,
            createStatusRenderer: () => statusRenderer,
            run: async () => {
                throw new Error('boom');
            },
        });

        expect(result.ok).toBe(false);
        expect(result.error?.message).toBe('boom');
        expect(statusRenderer.done).toHaveBeenCalled();
    });
});
