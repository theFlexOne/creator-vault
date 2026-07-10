import type { ChannelIngestReport, TranscriptIngestReport, VideoIngestReport } from '../types/ingestion.types';
import {
    runIngestChannelProfile,
    runIngestChannelVideos,
    runIngestTranscripts,
} from '../ingest';
import { runTestConnection } from '../services/testConnection.service';
import type { UiAction } from './menu';
import {
    createChannelIngestSummary,
    createDiagnosticsSummary,
    createPipelineSummary,
    createTranscriptIngestSummary,
    createVideoIngestSummary,
    formatUiSummary,
    isMaterialChannelFailure,
    isMaterialVideoFailure,
    type PipelineStepSummary,
} from './reports';
import { runUiTask, type UiTaskOutput, type UiTaskRunResult } from './runTask';
import {
    promptForChannelProfileWorkflow,
    promptForChannelVideosWorkflow,
    promptForFullPipelineWorkflow,
    promptForTranscriptWorkflow,
} from './workflowPrompts';

type WorkflowTaskRunner = typeof runUiTask;

type WorkflowDependencies = {
    promptForChannelProfileWorkflow: typeof promptForChannelProfileWorkflow;
    promptForChannelVideosWorkflow: typeof promptForChannelVideosWorkflow;
    promptForTranscriptWorkflow: typeof promptForTranscriptWorkflow;
    promptForFullPipelineWorkflow: typeof promptForFullPipelineWorkflow;
    runIngestChannelProfile: typeof runIngestChannelProfile;
    runIngestChannelVideos: typeof runIngestChannelVideos;
    runIngestTranscripts: typeof runIngestTranscripts;
    runTestConnection: typeof runTestConnection;
    runUiTask: WorkflowTaskRunner;
};

const defaultDependencies: WorkflowDependencies = {
    promptForChannelProfileWorkflow,
    promptForChannelVideosWorkflow,
    promptForTranscriptWorkflow,
    promptForFullPipelineWorkflow,
    runIngestChannelProfile,
    runIngestChannelVideos,
    runIngestTranscripts,
    runTestConnection,
    runUiTask,
};

function printSummary(output: UiTaskOutput, summaryText: string): void {
    output.log('');
    output.log(summaryText);
    output.log('');
}

function printSaveCancellation(output: UiTaskOutput, workflowName: string): void {
    output.warn(`Cancelled ${workflowName} before starting the save-enabled run.`);
}

async function runChannelProfileTask(
    dependencies: WorkflowDependencies,
    output: UiTaskOutput,
): Promise<void> {
    const promptResult = await dependencies.promptForChannelProfileWorkflow();

    if (promptResult.kind === 'cancel') {
        return;
    }

    if (promptResult.kind === 'aborted-save') {
        printSaveCancellation(output, 'channel metadata ingest');
        return;
    }

    const task = await dependencies.runUiTask<ChannelIngestReport>({
        title: 'Channel Metadata Ingest',
        output,
        run: () => dependencies.runIngestChannelProfile(
            promptResult.value.inputs,
            promptResult.value.save,
        ),
    });

    printSummary(output, formatUiSummary(createChannelIngestSummary(task)));
}

async function runChannelVideosTask(
    dependencies: WorkflowDependencies,
    output: UiTaskOutput,
): Promise<void> {
    const promptResult = await dependencies.promptForChannelVideosWorkflow();

    if (promptResult.kind === 'cancel') {
        return;
    }

    if (promptResult.kind === 'aborted-save') {
        printSaveCancellation(output, 'channel video ingest');
        return;
    }

    const task = await dependencies.runUiTask<VideoIngestReport>({
        title: 'Channel Video Ingest',
        output,
        run: () => dependencies.runIngestChannelVideos(
            promptResult.value.inputs,
            promptResult.value.limit,
            promptResult.value.save,
            promptResult.value.batch,
            promptResult.value.createChannel,
        ),
    });

    printSummary(output, formatUiSummary(createVideoIngestSummary(task)));
}

async function runTranscriptTask(
    dependencies: WorkflowDependencies,
    output: UiTaskOutput,
): Promise<void> {
    const promptResult = await dependencies.promptForTranscriptWorkflow();

    if (promptResult.kind === 'cancel') {
        return;
    }

    if (promptResult.kind === 'aborted-save') {
        printSaveCancellation(output, 'transcript ingest');
        return;
    }

    const task = await dependencies.runUiTask<TranscriptIngestReport>({
        title: 'Transcript Ingest',
        output,
        run: () => dependencies.runIngestTranscripts(
            promptResult.value.inputs,
            promptResult.value.limit,
            promptResult.value.save,
        ),
    });

    printSummary(output, formatUiSummary(createTranscriptIngestSummary(task)));
}

async function runDiagnosticsTask(
    dependencies: WorkflowDependencies,
    output: UiTaskOutput,
): Promise<void> {
    const task = await dependencies.runUiTask<void>({
        title: 'Test Connection',
        output,
        run: () => dependencies.runTestConnection(),
    });

    printSummary(output, formatUiSummary(createDiagnosticsSummary(task)));
}

type PipelineStop =
    | {
        stoppedAfter: string;
        stopReason: string;
    }
    | undefined;

function findPipelineStop(
    task: UiTaskRunResult<ChannelIngestReport | VideoIngestReport | TranscriptIngestReport>,
): PipelineStop {
    if (!task.ok) {
        return {
            stoppedAfter: task.title,
            stopReason: task.error?.message ?? 'Unhandled error.',
        };
    }

    if (task.result?.kind === 'channels' && isMaterialChannelFailure(task.result)) {
        return {
            stoppedAfter: task.title,
            stopReason: 'No channel metadata records were fetched successfully.',
        };
    }

    if (task.result?.kind === 'videos' && isMaterialVideoFailure(task.result)) {
        return {
            stoppedAfter: task.title,
            stopReason: 'No channels completed the video step successfully.',
        };
    }

    return undefined;
}

async function runFullPipelineTask(
    dependencies: WorkflowDependencies,
    output: UiTaskOutput,
): Promise<void> {
    const promptResult = await dependencies.promptForFullPipelineWorkflow();

    if (promptResult.kind === 'cancel') {
        return;
    }

    if (promptResult.kind === 'aborted-save') {
        printSaveCancellation(output, 'the full ingest pipeline');
        return;
    }

    const { inputs, save, videoLimit, videoBatch, createChannel, transcriptLimit } = promptResult.value;
    const steps: PipelineStepSummary[] = [];

    const profileTask = await dependencies.runUiTask<ChannelIngestReport>({
        title: 'Full Pipeline: Channel Metadata Ingest',
        output,
        run: () => dependencies.runIngestChannelProfile(inputs, save),
    });
    steps.push({
        action: 'Channel metadata ingest',
        summary: createChannelIngestSummary(profileTask),
    });

    let pipelineStop = findPipelineStop(profileTask);

    if (!pipelineStop) {
        const videoTask = await dependencies.runUiTask<VideoIngestReport>({
            title: 'Full Pipeline: Channel Video Ingest',
            output,
            run: () => dependencies.runIngestChannelVideos(
                inputs,
                videoLimit,
                save,
                videoBatch,
                createChannel,
            ),
        });
        steps.push({
            action: 'Channel video ingest',
            summary: createVideoIngestSummary(videoTask),
        });
        pipelineStop = findPipelineStop(videoTask);
    }

    if (!pipelineStop) {
        const transcriptTask = await dependencies.runUiTask<TranscriptIngestReport>({
            title: 'Full Pipeline: Transcript Ingest',
            output,
            run: () => dependencies.runIngestTranscripts(
                inputs,
                transcriptLimit,
                save,
            ),
        });
        steps.push({
            action: 'Transcript ingest',
            summary: createTranscriptIngestSummary(transcriptTask),
        });
    }

    printSummary(output, formatUiSummary(createPipelineSummary({
        title: 'Full Ingest Pipeline',
        steps,
        stoppedAfter: pipelineStop?.stoppedAfter,
        stopReason: pipelineStop?.stopReason,
    })));
}

export async function runUiAction(
    action: Exclude<UiAction, 'exit'>,
    output: UiTaskOutput = console,
    dependencies: WorkflowDependencies = defaultDependencies,
): Promise<void> {
    switch (action) {
        case 'ingest-channel-profile':
            await runChannelProfileTask(dependencies, output);
            return;
        case 'ingest-channel-videos':
            await runChannelVideosTask(dependencies, output);
            return;
        case 'ingest-transcripts':
            await runTranscriptTask(dependencies, output);
            return;
        case 'run-full-ingest-pipeline':
            await runFullPipelineTask(dependencies, output);
            return;
        case 'test-connection':
            await runDiagnosticsTask(dependencies, output);
            return;
    }
}
