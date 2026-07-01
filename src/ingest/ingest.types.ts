import type { ChannelIngestReport, TranscriptIngestReport, VideoIngestReport } from '../types/ingestion.types';

export type IngestChannelProfileOptions = {
    save: boolean;
};

export type IngestChannelVideosOptions = {
    limit: number;
    save: boolean;
    batch: number;
    createChannel?: boolean;
};

export type IngestTranscriptsOptions = {
    limit: number;
    save: boolean;
};

export type IngestModule = {
    ingestChannelProfile(inputs: string[], options: IngestChannelProfileOptions): Promise<ChannelIngestReport>;
    ingestChannelVideos(inputs: string[], options: IngestChannelVideosOptions): Promise<VideoIngestReport>;
    ingestTranscripts(inputs: string[], options: IngestTranscriptsOptions): Promise<TranscriptIngestReport>;
};
