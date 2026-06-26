export type ChannelRecord = {
    id?: number;
    youtubeChannelId?: string;
    name?: string;
    handle?: string;
    description?: string;
    followers?: number;
    tags?: string[];
    url?: string;
};

export type VideoRecord = {
    id?: number;
    channelId?: number;
    title?: string;
    url?: string;
    description?: string;
    duration?: number;
    uploadDate?: string;
    viewCount?: number;
    categories?: string[];
    tags?: string[];
    transcript?: string;
    youtubeVideoId?: string;
};

export type TranscriptRecord = {
    videoId?: number;
    text?: string;
    transcript?: string;
};

export type ChannelIngestReport = {
    kind: 'channels';
    inputs: string[];
    resolved: string[];
    save: boolean;
    fetched: ChannelRecord[];
    failed: string[];
    savedCount: number;
};

export type VideoChannelIngestReport = {
    identifier: string;
    fetchedChannel?: ChannelRecord;
    videoUrlsDiscovered: number;
    videosFetched: number;
    videosUpserted: number;
    batchFailures: number;
    failed: boolean;
};

export type VideoIngestReport = {
    kind: 'videos';
    inputs: string[];
    resolved: string[];
    save: boolean;
    limit: number;
    batchSize: number;
    channelsTotal: number;
    channelsSucceeded: number;
    channelsFailed: number;
    batchesFailed: number;
    videosUpserted: number;
    channelReports: VideoChannelIngestReport[];
};

export type TranscriptChannelResult = {
    channel: string;
    transcripts: TranscriptRecord[];
};

export type TranscriptIngestReport = {
    kind: 'transcripts';
    inputs: string[];
    resolved: string[];
    save: boolean;
    limit: number;
    channelsProcessed: number;
    missingChannels: string[];
    transcriptsFetched: number;
    transcriptsStored: number;
    results: TranscriptChannelResult[];
};
