import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { UiTaskRunResult } from '../runTask';

jest.mock('../../ingest', () => ({
    runIngestChannelProfile: jest.fn(),
    runIngestChannelVideos: jest.fn(),
    runIngestTranscripts: jest.fn(),
}));

jest.mock('../../services/testConnection.service', () => ({
    runTestConnection: jest.fn(),
}));

import { runUiAction } from '../workflows';

describe('UI workflows', () => {
    const output = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };

    const createSuccessfulTask = <T>(title: string, result: T): UiTaskRunResult<T> => ({
        title,
        ok: true,
        result,
        logs: [],
        warningCount: 0,
        errorCount: 0,
        durationMs: 1000,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function createTaskRunner() {
        return jest.fn(async ({ title, run }: { title: string; run: () => Promise<unknown> }) =>
            createSuccessfulTask(title, await run()),
        );
    }

    it('dispatches the channel metadata workflow through the task runner', async () => {
        const promptForChannelProfileWorkflow = jest.fn(async () => ({
            kind: 'submit' as const,
            value: { inputs: ['@alpha'], save: true },
        }));
        const runIngestChannelProfile = jest.fn(async () => ({
            kind: 'channels' as const,
            inputs: ['@alpha'],
            resolved: ['@alpha'],
            save: true,
            dryRun: false,
            fetched: [{ handle: '@alpha' }],
            failed: [],
            savedCount: 1,
            skippedRecords: 0,
            failures: [],
        }));
        const runUiTask = createTaskRunner();

        await runUiAction('ingest-channel-profile', output, {
            promptForChannelProfileWorkflow,
            promptForChannelVideosWorkflow: jest.fn(),
            promptForTranscriptWorkflow: jest.fn(),
            promptForFullPipelineWorkflow: jest.fn(),
            runIngestChannelProfile,
            runIngestChannelVideos: jest.fn(),
            runIngestTranscripts: jest.fn(),
            runTestConnection: jest.fn(),
            runUiTask,
        } as any);

        expect(runIngestChannelProfile).toHaveBeenCalledWith(['@alpha'], true);
        expect(runUiTask).toHaveBeenCalledTimes(1);
    });

    it('does not dispatch a save-enabled workflow when confirmation is cancelled', async () => {
        const runIngestChannelVideos = jest.fn();

        await runUiAction('ingest-channel-videos', output, {
            promptForChannelProfileWorkflow: jest.fn(),
            promptForChannelVideosWorkflow: jest.fn(async () => ({
                kind: 'aborted-save' as const,
            })),
            promptForTranscriptWorkflow: jest.fn(),
            promptForFullPipelineWorkflow: jest.fn(),
            runIngestChannelProfile: jest.fn(),
            runIngestChannelVideos,
            runIngestTranscripts: jest.fn(),
            runTestConnection: jest.fn(),
            runUiTask: jest.fn(),
        } as any);

        expect(runIngestChannelVideos).not.toHaveBeenCalled();
        expect(output.warn).toHaveBeenCalledWith(
            'Cancelled channel video ingest before starting the save-enabled run.',
        );
    });

    it('runs the full pipeline in order', async () => {
        const runOrder: string[] = [];
        const runUiTask = createTaskRunner();

        await runUiAction('run-full-ingest-pipeline', output, {
            promptForChannelProfileWorkflow: jest.fn(),
            promptForChannelVideosWorkflow: jest.fn(),
            promptForTranscriptWorkflow: jest.fn(),
            promptForFullPipelineWorkflow: jest.fn(async () => ({
                kind: 'submit' as const,
                value: {
                    inputs: ['@alpha'],
                    save: true,
                    videoLimit: 25,
                    videoBatch: 5,
                    createChannel: true,
                    transcriptLimit: 10,
                },
            })),
            runIngestChannelProfile: jest.fn(async () => {
                runOrder.push('profile');
                return {
                    kind: 'channels' as const,
                    inputs: ['@alpha'],
                    resolved: ['@alpha'],
                    save: true,
                    dryRun: false,
                    fetched: [{ handle: '@alpha' }],
                    failed: [],
                    savedCount: 1,
                    skippedRecords: 0,
                    failures: [],
                };
            }),
            runIngestChannelVideos: jest.fn(async () => {
                runOrder.push('videos');
                return {
                    kind: 'videos' as const,
                    inputs: ['@alpha'],
                    resolved: ['@alpha'],
                    save: true,
                    dryRun: false,
                    createChannel: true,
                    limit: 25,
                    batchSize: 5,
                    channelsTotal: 1,
                    channelsSucceeded: 1,
                    channelsFailed: 0,
                    channelsSkipped: 0,
                    batchesFailed: 0,
                    videosUpserted: 5,
                    captionsRequested: 5,
                    captionsDownloaded: 5,
                    captionsMissing: 0,
                    captionsFailed: 0,
                    transcriptVersionsCreated: 5,
                    transcriptVersionsUnchanged: 0,
                    transcriptSegmentsSaved: 25,
                    skippedRecords: 0,
                    parserDiagnostics: [],
                    failures: [],
                    channelReports: [],
                };
            }),
            runIngestTranscripts: jest.fn(async () => {
                runOrder.push('transcripts');
                return {
                    kind: 'transcripts' as const,
                    inputs: ['@alpha'],
                    resolved: ['@alpha'],
                    save: true,
                    dryRun: false,
                    limit: 10,
                    channelsProcessed: 1,
                    missingChannels: [],
                    transcriptsFetched: 2,
                    transcriptsStored: 2,
                    captionsRequested: 2,
                    captionsDownloaded: 2,
                    captionsMissing: 0,
                    captionsFailed: 0,
                    transcriptVersionsCreated: 2,
                    transcriptVersionsUnchanged: 0,
                    transcriptSegmentsSaved: 10,
                    skippedRecords: 0,
                    parserDiagnostics: [],
                    failures: [],
                    results: [],
                };
            }),
            runTestConnection: jest.fn(),
            runUiTask,
        } as any);

        expect(runOrder).toEqual(['profile', 'videos', 'transcripts']);
        expect(runUiTask).toHaveBeenCalledTimes(3);
    });

    it('stops the full pipeline after a material channel metadata failure', async () => {
        const runIngestChannelVideos = jest.fn();
        const runIngestTranscripts = jest.fn();

        await runUiAction('run-full-ingest-pipeline', output, {
            promptForChannelProfileWorkflow: jest.fn(),
            promptForChannelVideosWorkflow: jest.fn(),
            promptForTranscriptWorkflow: jest.fn(),
            promptForFullPipelineWorkflow: jest.fn(async () => ({
                kind: 'submit' as const,
                value: {
                    inputs: ['@alpha'],
                    save: true,
                    videoLimit: 25,
                    videoBatch: 5,
                    createChannel: true,
                    transcriptLimit: 10,
                },
            })),
            runIngestChannelProfile: jest.fn(async () => ({
                kind: 'channels' as const,
                inputs: ['@alpha'],
                resolved: ['@alpha'],
                save: true,
                dryRun: false,
                fetched: [],
                failed: ['@alpha'],
                savedCount: 0,
                skippedRecords: 0,
                failures: [{
                    scope: 'channel' as const,
                    identifier: '@alpha',
                    message: 'failed',
                }],
            })),
            runIngestChannelVideos,
            runIngestTranscripts,
            runTestConnection: jest.fn(),
            runUiTask: createTaskRunner(),
        } as any);

        expect(runIngestChannelVideos).not.toHaveBeenCalled();
        expect(runIngestTranscripts).not.toHaveBeenCalled();
        expect(output.log).toHaveBeenCalled();
    });
});
