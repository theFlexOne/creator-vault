import { logger } from '../shared/logger';
import getChannelInfo from '../lib/youtube/getChannelInfo';
import { upsertChannelInfo } from '../repositories/channel.repository';
import { resolveIdentifiers } from './command.service';
import type { ChannelIngestReport } from '../types/ingestion.types';

export async function runIngestChannelProfileWorkflow(inputs: string[], save: boolean): Promise<ChannelIngestReport> {
    const urls = await resolveIdentifiers(inputs);
    const report: ChannelIngestReport = {
        kind: 'channels',
        inputs,
        resolved: urls,
        save,
        fetched: [],
        failed: [],
        savedCount: 0,
    };

    for (const url of urls) {
        logger.info(`Ingesting channel profile for: ${url}`);

        try {
            const channelInfo = await getChannelInfo(url);
            if (!channelInfo) {
                logger.error(`Failed to ingest channel profile for ${url}.`);
                report.failed.push(url);
                continue;
            }

            report.fetched.push(channelInfo);
            if (save) {
                upsertChannelInfo(channelInfo);
                report.savedCount += 1;
            } else {
                logger.info(JSON.stringify(channelInfo, null, 2));
                logger.info('Channel not saved (use --save to store in DB).');
            }

        } catch (error) {
            logger.error(`Error during ingestChannelProfile for ${url}:`, error);
            report.failed.push(url);
        }
    }

    return report;
}
