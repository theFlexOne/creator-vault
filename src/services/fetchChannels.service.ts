import { logger } from '../shared/logger';
import getChannelInfo from '../lib/youtube/getChannelInfo';
import { upsertChannelInfo } from '../repositories/channel.repository';
import { resolveIdentifiers } from './command.service';

export async function runFetchChannels(inputs: string[], save: boolean): Promise<void> {
    const urls = await resolveIdentifiers(inputs);

    for (const url of urls) {
        logger.info(`Fetching channel info for: ${url}`);

        try {
            const channelInfo = await getChannelInfo(url);
            if (!channelInfo) {
                logger.error(`Failed to fetch channel info for ${url}.`);
                continue;
            }

            if (save) {
                upsertChannelInfo(channelInfo);
            } else {
                logger.info(JSON.stringify(channelInfo, null, 2));
                logger.info('Channel not saved (use --save to store in DB).');
            }

        } catch (error) {
            logger.error(`Error during fetchChannel for ${url}:`, error);
        }
    }
}
