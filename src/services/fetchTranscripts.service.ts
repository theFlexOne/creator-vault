import { logger } from '../shared/logger';
import getChannelTranscripts from '../lib/youtube/getChannelTranscripts';
import { upsertTranscriptData } from '../repositories/transcript.repository';
import { getChannelInternalId } from '../repositories/channel.repository';
import { getVideosMissingTranscripts } from '../repositories/video.repository';
import { resolveIdentifiers } from './command.service';

export async function runFetchTranscripts(inputs: string[], limit: number, save: boolean, json: boolean): Promise<void> {
    const channels = await resolveIdentifiers(inputs);

    if (json) {
        process.stderr.write(`Resolved ${channels.length} channels to process.\n`);
    } else {
        logger.info(`Resolved ${channels.length} channels to process.`);
    }

    const results = [];

    for (const channelIdentifier of channels) {
        if (!json) logger.info(`Fetching transcripts for channel: ${channelIdentifier} (Limit: ${limit})`);

        try {
            const channelInternalId = getChannelInternalId(channelIdentifier);
            if (!channelInternalId) {
                logger.error(`Channel "${channelIdentifier}" not found in the database. Please add it first using fetch-channels.`);
                continue;
            }

            const videosToProcess = getVideosMissingTranscripts(channelInternalId, limit);

            if (videosToProcess.length === 0) {
                if (!json) logger.info(`No videos found missing transcripts for ${channelIdentifier} within the specified limit.`);
                continue;
            }

            const videoIds = videosToProcess.map(v => v.id);
            if (!json) logger.info(`Found ${videoIds.length} videos missing transcripts.`);

            const transcripts = await getChannelTranscripts(videoIds);

            if (json) {
                results.push({ channel: channelIdentifier, transcripts });
            } else {
                logger.info(`Fetched ${transcripts.length} transcripts.`);
            }

            if (save) {
                const storedCount = upsertTranscriptData(transcripts);
                if (!json) logger.info(`Successfully stored ${storedCount} transcripts.`);
            } else if (!json) {
                logger.info('Transcripts not saved (use --save to store in DB).');
            }

        } catch (error) {
            logger.error(`Error during fetchTranscripts for ${channelIdentifier}:`, error);
        }
    }

    if (json) {
        console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
    }
}
