import { bold, cyan, green, red, yellow } from 'picocolors';
import type {
    ChannelIngestReport,
    TranscriptIngestReport,
    VideoIngestReport,
} from '../types/ingestion.types';
import type { UiTaskRunResult } from './runTask';

export type UiSummaryStatus = 'success' | 'warning' | 'failure';

export type UiSummary = {
    title: string;
    status: UiSummaryStatus;
    lines: string[];
};

export type PipelineStepSummary = {
    action: string;
    summary: UiSummary;
};

function formatDuration(durationMs: number): string {
    return `${(durationMs / 1000).toFixed(1)}s`;
}

function summarizeTaskMeta<T>(task: UiTaskRunResult<T>): string {
    return `Runtime: ${formatDuration(task.durationMs)}, ${task.logs.length} logs, ${task.warningCount} warnings, ${task.errorCount} errors`;
}

function createFailureSummary<T>(task: UiTaskRunResult<T>): UiSummary {
    return {
        title: task.title,
        status: 'failure',
        lines: [
            task.error?.message ?? 'The workflow failed before returning a report.',
            summarizeTaskMeta(task),
        ],
    };
}

export function isMaterialChannelFailure(report: ChannelIngestReport): boolean {
    return report.fetched.length === 0 && report.failures.length > 0;
}

export function isMaterialVideoFailure(report: VideoIngestReport): boolean {
    return report.channelsSucceeded === 0 && (report.channelsFailed > 0 || report.failures.length > 0);
}

export function createChannelIngestSummary(
    task: UiTaskRunResult<ChannelIngestReport>,
): UiSummary {
    if (!task.ok || !task.result) {
        return createFailureSummary(task);
    }

    const report = task.result;
    const status: UiSummaryStatus = isMaterialChannelFailure(report)
        ? 'failure'
        : report.failures.length > 0 || report.failed.length > 0
            ? 'warning'
            : 'success';

    return {
        title: task.title,
        status,
        lines: [
            `Resolved ${report.resolved.length} inputs and fetched ${report.fetched.length} channel profiles.`,
            report.save
                ? `Saved ${report.savedCount} channels to SQLite.`
                : `Dry run only. Skipped ${report.skippedRecords} writes.`,
            `Failures: ${report.failures.length}.`,
            summarizeTaskMeta(task),
        ],
    };
}

export function createVideoIngestSummary(
    task: UiTaskRunResult<VideoIngestReport>,
): UiSummary {
    if (!task.ok || !task.result) {
        return createFailureSummary(task);
    }

    const report = task.result;
    const status: UiSummaryStatus = isMaterialVideoFailure(report)
        ? 'failure'
        : report.failures.length > 0 || report.channelsFailed > 0 || report.batchesFailed > 0
            ? 'warning'
            : 'success';

    return {
        title: task.title,
        status,
        lines: [
            `Channels: ${report.channelsTotal} total, ${report.channelsSucceeded} succeeded, ${report.channelsFailed} failed, ${report.channelsSkipped} skipped.`,
            `Videos: ${report.videosUpserted} upserted with limit ${report.limit} and batch size ${report.batchSize}.`,
            `Captions: ${report.captionsRequested} requested, ${report.captionsDownloaded} downloaded, ${report.captionsMissing} missing, ${report.captionsFailed} failed.`,
            `Transcript versions: ${report.transcriptVersionsCreated} created, ${report.transcriptVersionsUnchanged} unchanged, ${report.transcriptSegmentsSaved} segments saved.`,
            summarizeTaskMeta(task),
        ],
    };
}

export function createTranscriptIngestSummary(
    task: UiTaskRunResult<TranscriptIngestReport>,
): UiSummary {
    if (!task.ok || !task.result) {
        return createFailureSummary(task);
    }

    const report = task.result;
    const status: UiSummaryStatus = report.failures.length > 0
        ? 'failure'
        : report.missingChannels.length > 0 || report.captionsFailed > 0
            ? 'warning'
            : 'success';

    return {
        title: task.title,
        status,
        lines: [
            `Processed ${report.channelsProcessed} channels and fetched ${report.transcriptsFetched} transcripts.`,
            report.save
                ? `Stored ${report.transcriptsStored} transcript versions and ${report.transcriptSegmentsSaved} segments.`
                : `Dry run only. No transcripts were written to SQLite.`,
            `Missing channels: ${report.missingChannels.length}. Caption failures: ${report.captionsFailed}.`,
            summarizeTaskMeta(task),
        ],
    };
}

export function createDiagnosticsSummary(
    task: UiTaskRunResult<void>,
): UiSummary {
    if (!task.ok) {
        return createFailureSummary(task);
    }

    const status: UiSummaryStatus = task.errorCount > 0
        ? 'failure'
        : task.warningCount > 0
            ? 'warning'
            : 'success';

    return {
        title: task.title,
        status,
        lines: [
            `Diagnostics finished with ${task.errorCount} errors and ${task.warningCount} warnings.`,
            summarizeTaskMeta(task),
        ],
    };
}

export function createPipelineSummary(options: {
    title: string;
    steps: PipelineStepSummary[];
    stoppedAfter?: string;
    stopReason?: string;
}): UiSummary {
    const overallStatus: UiSummaryStatus = options.stoppedAfter
        ? 'failure'
        : options.steps.some((step) => step.summary.status === 'failure')
            ? 'failure'
            : options.steps.some((step) => step.summary.status === 'warning')
                ? 'warning'
                : 'success';

    const lines = options.steps.map(
        (step) => `${step.action}: ${step.summary.status}`,
    );

    if (options.stoppedAfter && options.stopReason) {
        lines.push(`Stopped after ${options.stoppedAfter}: ${options.stopReason}`);
    } else {
        lines.push('Pipeline completed all three steps in order.');
    }

    return {
        title: options.title,
        status: overallStatus,
        lines,
    };
}

export function formatUiSummary(summary: UiSummary): string {
    const statusLabel = summary.status === 'success'
        ? green('SUCCESS')
        : summary.status === 'warning'
            ? yellow('WARNING')
            : red('FAILURE');

    return [
        `${bold(summary.title)} ${cyan(`[${statusLabel}]`)}`,
        ...summary.lines.map((line) => `- ${line}`),
    ].join('\n');
}
