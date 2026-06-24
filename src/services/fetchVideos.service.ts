import { logger } from '../shared/logger';
import getChannelInfo from '../lib/youtube/getChannelInfo';
import getChannelVideoUrls from '../lib/youtube/getChannelVideoUrls';
import getVideoInfo from '../lib/youtube/getVideoInfo';
import { upsertVideoInfo } from '../repositories/video.repository';
import { getChannelInternalId } from '../repositories/channel.repository';
import { resolveIdentifiers } from './command.service';

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
};

export async function runFetchVideos(inputs: string[], limit: number, save: boolean, batch: number): Promise<void> {
    const summary = {
        channelsTotal: 0,
        channelsSucceeded: 0,
        channelsFailed: 0,
        batchesFailed: 0,
        videosUpserted: 0,
    };

    let identifiers: string[];
    try {
        identifiers = await resolveIdentifiers(inputs);
    } catch (error) {
        logger.error(`Failed to resolve identifiers: ${getErrorMessage(error)}`);
        throw error;
    }

    if (identifiers.length === 0) {
        logger.warn('No valid channel identifiers were provided.');
        return;
    }

    summary.channelsTotal = identifiers.length;

    for (const identifier of identifiers) {
        try {
            logger.info(`Processing channel: ${identifier}`);
            const channelInfo = await getChannelInfo(identifier);
            if (!channelInfo) {
                logger.warn(`Failed to fetch channel info for: ${identifier}`);
                summary.channelsFailed += 1;
                continue;
            }

            let channelId: number | undefined;
            if (save) {
                const youtubeChannelId = channelInfo.youtubeChannelId;
                const channelHandle = channelInfo.handle;

                if (!youtubeChannelId && !channelHandle) {
                    logger.warn(`Channel has no youtubeChannelId or handle. Skipping save for: ${identifier}`);
                    summary.channelsFailed += 1;
                    continue;
                }

                channelId = youtubeChannelId ? getChannelInternalId(youtubeChannelId) : undefined;
                if (!channelId && channelHandle) {
                    channelId = getChannelInternalId(channelHandle);
                }

                if (!channelId) {
                    logger.warn(`Channel not found in DB: ${identifier}. Skipping.`);
                    summary.channelsFailed += 1;
                    continue;
                }
            }

            const videoUrls = await getChannelVideoUrls(identifier, 1, limit ?? null);
            const totalToProcess = limit !== null ? Math.min(limit, videoUrls.length) : videoUrls.length;
            if (totalToProcess === 0) {
                logger.info(`No videos to process for channel: ${identifier}`);
                summary.channelsSucceeded += 1;
                continue;
            }

            let counter = 0;
            while (counter < totalToProcess) {
                const batchSize = Math.min(batch, totalToProcess - counter);
                const limitedVideoUrls = videoUrls.slice(counter, counter + batchSize);

                try {
                    const videoInfoList = await getVideoInfo(limitedVideoUrls);

                    if (save && channelId) {
                        const upsertedCount = upsertVideoInfo(channelId, videoInfoList);
                        summary.videosUpserted += upsertedCount;
                        logger.info(`Upserted ${upsertedCount} videos for channel: ${identifier} (batch starting at ${counter})`);
                    }
                } catch (error) {
                    summary.batchesFailed += 1;
                    logger.error(`Batch failed for channel ${identifier} at offset ${counter}: ${getErrorMessage(error)}`);
                } finally {
                    counter += batchSize;
                }
            }

            logger.info(`Finished processing ${counter} videos for channel: ${identifier}`);
            summary.channelsSucceeded += 1;
        } catch (error) {
            summary.channelsFailed += 1;
            logger.error(`Channel failed for ${identifier}: ${getErrorMessage(error)}`);
        }
    }

    logger.info(
        `Done. channels=${summary.channelsTotal}, succeeded=${summary.channelsSucceeded}, failed=${summary.channelsFailed}, batchFailures=${summary.batchesFailed}, upserted=${summary.videosUpserted}`,
    );

    if (summary.channelsFailed > 0 || summary.batchesFailed > 0) {
        throw new Error(
            `Completed with failures: channelsFailed=${summary.channelsFailed}, batchFailures=${summary.batchesFailed}`,
        );
    }
}
