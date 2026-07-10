import { describe, expect, it } from '@jest/globals';
import {
    createChannelIngestSummary,
    createDiagnosticsSummary,
    createTranscriptIngestSummary,
    createVideoIngestSummary,
} from '../reports';

describe('UI report summaries', () => {
    it('summarizes channel ingest reports', () => {
        const summary = createChannelIngestSummary({
            title: 'Channel Metadata Ingest',
            ok: true,
            result: {
                kind: 'channels',
                inputs: ['@alpha'],
                resolved: ['@alpha'],
                save: true,
                dryRun: false,
                fetched: [{ handle: '@alpha' }],
                failed: [],
                savedCount: 1,
                skippedRecords: 0,
                failures: [],
            },
            logs: [],
            warningCount: 0,
            errorCount: 0,
            durationMs: 1200,
        });

        expect(summary.status).toBe('success');
        expect(summary.lines[0]).toContain('Resolved 1 inputs');
    });

    it('summarizes video ingest reports', () => {
        const summary = createVideoIngestSummary({
            title: 'Channel Video Ingest',
            ok: true,
            result: {
                kind: 'videos',
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
                videosUpserted: 20,
                captionsRequested: 20,
                captionsDownloaded: 18,
                captionsMissing: 2,
                captionsFailed: 0,
                transcriptVersionsCreated: 18,
                transcriptVersionsUnchanged: 0,
                transcriptSegmentsSaved: 150,
                skippedRecords: 0,
                parserDiagnostics: [],
                failures: [],
                channelReports: [],
            },
            logs: [],
            warningCount: 0,
            errorCount: 0,
            durationMs: 2500,
        });

        expect(summary.status).toBe('success');
        expect(summary.lines[2]).toContain('Captions: 20 requested');
    });

    it('summarizes transcript ingest reports', () => {
        const summary = createTranscriptIngestSummary({
            title: 'Transcript Ingest',
            ok: true,
            result: {
                kind: 'transcripts',
                inputs: ['@alpha'],
                resolved: ['@alpha'],
                save: false,
                dryRun: true,
                limit: 10,
                channelsProcessed: 1,
                missingChannels: [],
                transcriptsFetched: 4,
                transcriptsStored: 0,
                captionsRequested: 4,
                captionsDownloaded: 4,
                captionsMissing: 0,
                captionsFailed: 0,
                transcriptVersionsCreated: 0,
                transcriptVersionsUnchanged: 0,
                transcriptSegmentsSaved: 0,
                skippedRecords: 0,
                parserDiagnostics: [],
                failures: [],
                results: [],
            },
            logs: [],
            warningCount: 0,
            errorCount: 0,
            durationMs: 900,
        });

        expect(summary.status).toBe('success');
        expect(summary.lines[1]).toContain('Dry run only');
    });

    it('summarizes diagnostics from captured log severities', () => {
        const summary = createDiagnosticsSummary({
            title: 'Test Connection',
            ok: true,
            logs: [],
            warningCount: 1,
            errorCount: 0,
            durationMs: 700,
        });

        expect(summary.status).toBe('warning');
        expect(summary.lines[0]).toContain('1 warnings');
    });
});
