import { logger } from '../shared/logger';
import getChannelTranscripts from '../lib/youtube/getChannelTranscripts';
import { upsertTranscriptData } from '../repositories/transcript.repository';
import { getChannelInternalId } from '../repositories/channel.repository';
import { getVideosMissingTranscripts } from '../repositories/video.repository';
import { resolveIdentifiers } from './command.service';
import type { TranscriptChannelResult, TranscriptIngestReport } from '../types/ingestion.types';

export async function runIngestTranscriptsWorkflow(inputs: string[], limit: number, save: boolean): Promise<TranscriptIngestReport> {
    const channels = await resolveIdentifiers(inputs);
    const results: TranscriptChannelResult[] = [];
    const report: TranscriptIngestReport = {
        kind: 'transcripts',
        inputs,
        resolved: channels,
        save,
        dryRun: !save,
        limit,
        channelsProcessed: channels.length,
        missingChannels: [],
        transcriptsFetched: 0,
        transcriptsStored: 0,
        captionsRequested: 0,
        captionsDownloaded: 0,
        captionsMissing: 0,
        captionsFailed: 0,
        transcriptVersionsCreated: 0,
        transcriptVersionsUnchanged: 0,
        transcriptSegmentsSaved: 0,
        skippedRecords: 0,
        parserDiagnostics: [],
        failures: [],
        results,
    };

    logger.info(`Resolved ${channels.length} channels to process.`);

    for (const channelIdentifier of channels) {
        logger.info(`Ingesting transcripts for channel: ${channelIdentifier} (Limit: ${limit})`);

        try {
            const channelInternalId = getChannelInternalId(channelIdentifier);
            if (!channelInternalId) {
                logger.error(`Channel "${channelIdentifier}" not found in the database. Please add it first using ingest-channel-profile.`);
                report.missingChannels.push(channelIdentifier);
                report.skippedRecords += 1;
                continue;
            }

            const videosToProcess = getVideosMissingTranscripts(channelInternalId, limit);

            if (videosToProcess.length === 0) {
                logger.info(`No videos found missing transcripts for ${channelIdentifier} within the specified limit.`);
                report.skippedRecords += 1;
                continue;
            }

            const videoIds = videosToProcess.map(v => v.id);
            logger.info(`Found ${videoIds.length} videos missing transcripts.`);

            const transcripts = await getChannelTranscripts(videoIds);
            report.captionsRequested += videoIds.length;
            report.captionsDownloaded += transcripts.length;
            report.captionsMissing += Math.max(0, videoIds.length - transcripts.length);
            report.transcriptsFetched += transcripts.length;
            results.push({ channel: channelIdentifier, transcripts });
            logger.info(`Ingested ${transcripts.length} transcripts.`);

            if (save) {
                const storedCount = upsertTranscriptData(transcripts);
                report.transcriptsStored += storedCount;
                report.transcriptVersionsCreated += storedCount;
                logger.info(`Successfully stored ${storedCount} transcripts.`);
            } else {
                report.skippedRecords += transcripts.length;
                logger.info('Transcripts not saved (use --save to store in DB).');
            }

        } catch (error) {
            report.failures.push({
                scope: 'channel',
                identifier: channelIdentifier,
                message: error instanceof Error ? error.message : String(error),
            });
            logger.error(`Error during ingestTranscripts for ${channelIdentifier}:`, error);
        }
    }

    return report;
}
