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
    youtubeVideoId?: string;
    captionSource?: 'manual' | 'automatic';
    language?: string;
    segmentCount?: number;
    transcriptVersionCreated?: boolean;
    text?: string;
    transcript?: string;
};

export type IngestFailure = {
    scope: 'channel' | 'video-page' | 'caption' | 'transcript-version' | 'transcript-segment' | 'parser';
    identifier: string;
    message: string;
};

export type IngestParserDiagnostic = {
    videoId?: number;
    youtubeVideoId?: string;
    captionSource: 'manual' | 'automatic';
    language: string;
    code: string;
    message: string;
    eventIndex?: number;
};

export type ChannelIngestReport = {
    kind: 'channels';
    inputs: string[];
    resolved: string[];
    save: boolean;
    dryRun: boolean;
    fetched: ChannelRecord[];
    failed: string[];
    savedCount: number;
    skippedRecords: number;
    failures: IngestFailure[];
};

export type VideoChannelIngestReport = {
    identifier: string;
    fetchedChannel?: ChannelRecord;
    videoUrlsDiscovered: number;
    videosFetched: number;
    videosUpserted: number;
    batchFailures: number;
    captionsRequested: number;
    captionsDownloaded: number;
    captionsMissing: number;
    captionsFailed: number;
    transcriptVersionsCreated: number;
    transcriptVersionsUnchanged: number;
    transcriptSegmentsSaved: number;
    skippedRecords: number;
    parserDiagnostics: IngestParserDiagnostic[];
    failures: IngestFailure[];
    failed: boolean;
    skipped: boolean;
};

export type VideoIngestReport = {
    kind: 'videos';
    inputs: string[];
    resolved: string[];
    save: boolean;
    dryRun: boolean;
    createChannel: boolean;
    limit: number;
    batchSize: number;
    channelsTotal: number;
    channelsSucceeded: number;
    channelsFailed: number;
    channelsSkipped: number;
    batchesFailed: number;
    videosUpserted: number;
    captionsRequested: number;
    captionsDownloaded: number;
    captionsMissing: number;
    captionsFailed: number;
    transcriptVersionsCreated: number;
    transcriptVersionsUnchanged: number;
    transcriptSegmentsSaved: number;
    skippedRecords: number;
    parserDiagnostics: IngestParserDiagnostic[];
    failures: IngestFailure[];
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
    dryRun: boolean;
    limit: number;
    channelsProcessed: number;
    missingChannels: string[];
    transcriptsFetched: number;
    transcriptsStored: number;
    captionsRequested: number;
    captionsDownloaded: number;
    captionsMissing: number;
    captionsFailed: number;
    transcriptVersionsCreated: number;
    transcriptVersionsUnchanged: number;
    transcriptSegmentsSaved: number;
    skippedRecords: number;
    parserDiagnostics: IngestParserDiagnostic[];
    failures: IngestFailure[];
    results: TranscriptChannelResult[];
};
