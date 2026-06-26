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
        limit,
        channelsProcessed: channels.length,
        missingChannels: [],
        transcriptsFetched: 0,
        transcriptsStored: 0,
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
                continue;
            }

            const videosToProcess = getVideosMissingTranscripts(channelInternalId, limit);

            if (videosToProcess.length === 0) {
                logger.info(`No videos found missing transcripts for ${channelIdentifier} within the specified limit.`);
                continue;
            }

            const videoIds = videosToProcess.map(v => v.id);
            logger.info(`Found ${videoIds.length} videos missing transcripts.`);

            const transcripts = await getChannelTranscripts(videoIds);
            report.transcriptsFetched += transcripts.length;
            results.push({ channel: channelIdentifier, transcripts });
            logger.info(`Ingested ${transcripts.length} transcripts.`);

            if (save) {
                const storedCount = upsertTranscriptData(transcripts);
                report.transcriptsStored += storedCount;
                logger.info(`Successfully stored ${storedCount} transcripts.`);
            } else {
                logger.info('Transcripts not saved (use --save to store in DB).');
            }

        } catch (error) {
            logger.error(`Error during ingestTranscripts for ${channelIdentifier}:`, error);
        }
    }

    return report;
}
