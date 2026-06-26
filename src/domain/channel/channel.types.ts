import type { ChannelRecord, VideoRecord } from '../../types/ingestion.types';

export type ChannelDTO = ChannelRecord & {
    ytChannelId?: string;
    videos?: VideoRecord[];
};
