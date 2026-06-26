import type { ChannelRecord, VideoRecord } from '../types/ingestion.types';

export type MissingChannelPolicy = {
    createChannel: boolean;
};

export type StubCreatorInput = {
    name: string;
    channelName: string;
};

export type StoredCreator = {
    creatorId: number;
    name: string;
};

export type StoredChannel = {
    channelId: number;
    youtubeChannelId?: string;
    handle?: string;
};

export type SaveVideosResult = {
    savedCount: number;
};

export type LatestTranscriptVersionQuery = {
    videoId: number;
    captionSource: 'manual' | 'automatic';
    language: string;
};

export type TranscriptVersionRecord = {
    transcriptId: number;
    videoId: number;
    captionSource: 'manual' | 'automatic';
    language: string;
    version: number;
    rawFormat: 'json3';
    checksum: string;
};

export type SaveTranscriptVersionInput = {
    videoId: number;
    captionSource: 'manual' | 'automatic';
    language: string;
    rawFormat: 'json3';
    rawBlob: string;
    checksum: string;
};

export type TranscriptSegmentInput = {
    transcriptId: number;
    idx: number;
    startMs: number;
    endMs: number;
    text: string;
    speaker?: string;
    confidence?: number;
};

export interface IngestStorage {
    findOrCreateStubCreator(input: StubCreatorInput): Promise<StoredCreator>;
    findOrCreateYoutubeChannel(
        channel: ChannelRecord,
        policy: MissingChannelPolicy,
    ): Promise<StoredChannel | undefined>;
    saveVideos(channelId: number, videos: VideoRecord[]): Promise<SaveVideosResult>;
    findLatestTranscriptVersion(query: LatestTranscriptVersionQuery): Promise<TranscriptVersionRecord | undefined>;
    saveTranscriptVersion(input: SaveTranscriptVersionInput): Promise<TranscriptVersionRecord>;
    saveTranscriptSegments(segments: TranscriptSegmentInput[]): Promise<{ savedCount: number }>;
}

export function createProductionIngestStorageStub(): IngestStorage {
    const notWired = (method: string) => {
        throw new Error(`TODO: wire production ingest storage for ${method}`);
    };

    return {
        async findOrCreateStubCreator() {
            // TODO(ingest): createChannel=true should create/reuse a stub Creator named from the YouTube channel.
            return notWired('stub creator lookup');
        },

        async findOrCreateYoutubeChannel() {
            // TODO(ingest): createChannel=false should preserve current missing-channel skip behavior.
            return notWired('YouTube channel lookup');
        },

        async saveVideos() {
            return notWired('video persistence');
        },

        async findLatestTranscriptVersion() {
            // TODO(ingest): Future schema stores transcript versions in transcripts.
            return notWired('latest transcript version lookup');
        },

        async saveTranscriptVersion() {
            // TODO(ingest): Future schema stores raw json3 payloads and checksums in transcripts.
            return notWired('transcript version persistence');
        },

        async saveTranscriptSegments() {
            // TODO(ingest): Future schema stores normalized time-coded rows in transcript_segments.
            return notWired('transcript segment persistence');
        },
    };
}
