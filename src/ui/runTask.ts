import { dim, red, yellow } from 'picocolors';
import { logger } from '../shared/logger';
import { createUiStatusRenderer, type UiStatusRenderer } from './statusRenderer';

export type UiLogLevel = 'info' | 'warn' | 'error';

export type UiLogEvent = {
    level: UiLogLevel;
    message: string;
};

export type UiTaskRunResult<T> = {
    title: string;
    ok: boolean;
    result?: T;
    error?: Error;
    logs: UiLogEvent[];
    warningCount: number;
    errorCount: number;
    durationMs: number;
};

export type UiTaskOutput = Pick<Console, 'log' | 'warn' | 'error'>;

type UiLoggerTarget = {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
};

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function formatLogMessage(args: unknown[]): string {
    return args
        .map((value) => {
            if (value instanceof Error) {
                return value.stack ?? value.message;
            }

            if (typeof value === 'string') {
                return value;
            }

            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        })
        .join(' ');
}

function formatLogLine(event: UiLogEvent): string {
    const prefix = event.level === 'error'
        ? red('[error]')
        : event.level === 'warn'
            ? yellow('[warn]')
            : dim('[info]');

    return `${prefix} ${event.message}`;
}

export async function runUiTask<T>(options: {
    title: string;
    run: () => Promise<T>;
    output?: UiTaskOutput;
    loggerTarget?: UiLoggerTarget;
    createStatusRenderer?: () => UiStatusRenderer | Promise<UiStatusRenderer>;
}): Promise<UiTaskRunResult<T>> {
    const output = options.output ?? console;
    const loggerTarget = options.loggerTarget ?? logger;
    const createStatusRenderer = options.createStatusRenderer ?? createUiStatusRenderer;
    const statusRenderer = await createStatusRenderer();
    const startedAt = Date.now();
    const logs: UiLogEvent[] = [];
    let warningCount = 0;
    let errorCount = 0;

    const originalInfo = loggerTarget.info.bind(loggerTarget);
    const originalWarn = loggerTarget.warn.bind(loggerTarget);
    const originalError = loggerTarget.error.bind(loggerTarget);

    const updateStatus = (label: string) => {
        const runtimeSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        statusRenderer.update(
            `${label} ${options.title} ${dim(`(${logs.length} logs, ${warningCount} warnings, ${errorCount} errors, ${runtimeSeconds}s)`)}`,
        );
    };

    const emit = (level: UiLogLevel, args: unknown[]) => {
        const message = formatLogMessage(args);
        const event = { level, message };
        logs.push(event);

        if (level === 'warn') {
            warningCount += 1;
            output.warn(formatLogLine(event));
        } else if (level === 'error') {
            errorCount += 1;
            output.error(formatLogLine(event));
        } else {
            output.log(formatLogLine(event));
        }

        updateStatus('Running');
    };

    loggerTarget.info = (...args: unknown[]) => emit('info', args);
    loggerTarget.warn = (...args: unknown[]) => emit('warn', args);
    loggerTarget.error = (...args: unknown[]) => emit('error', args);

    updateStatus('Starting');

    try {
        const result = await options.run();
        updateStatus('Completed');
        statusRenderer.done();

        return {
            title: options.title,
            ok: true,
            result,
            logs,
            warningCount,
            errorCount,
            durationMs: Date.now() - startedAt,
        };
    } catch (error) {
        const resolvedError = toError(error);
        emit('error', [resolvedError]);
        updateStatus('Failed');
        statusRenderer.done();

        return {
            title: options.title,
            ok: false,
            error: resolvedError,
            logs,
            warningCount,
            errorCount,
            durationMs: Date.now() - startedAt,
        };
    } finally {
        loggerTarget.info = originalInfo;
        loggerTarget.warn = originalWarn;
        loggerTarget.error = originalError;
    }
}
