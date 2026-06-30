import type { ChannelRecord, VideoRecord } from '../types/ingestion.types';
import { findOrCreateCreatorByName } from '../repositories/creator.repository';
import {
    findYoutubeChannelByIdentity,
    upsertYoutubeChannelForCreator,
} from '../repositories/channel.repository';
import {
    getVideosMissingTranscripts,
    upsertVideoInfo,
} from '../repositories/video.repository';
import {
    findLatestTranscriptVersion as findLatestTranscriptVersionRecord,
    saveTranscriptSegments as saveTranscriptSegmentRecords,
    saveTranscriptVersion as saveTranscriptVersionRecord,
    type TranscriptVersionRow,
} from '../repositories/transcript.repository';

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
    rawBlob: string;
    checksum: string;
    createdAt?: string;
};

export type SaveTranscriptVersionResult = TranscriptVersionRecord & {
    isNewVersion: boolean;
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

export type VideoNeedingTranscript = {
    id: number;
    youtubeVideoId: string;
};

export interface IngestStorage {
    findOrCreateStubCreator(input: StubCreatorInput): Promise<StoredCreator>;
    findOrCreateYoutubeChannel(
        channel: ChannelRecord,
        policy: MissingChannelPolicy,
    ): Promise<StoredChannel | undefined>;
    saveVideos(channelId: number, videos: VideoRecord[]): Promise<SaveVideosResult>;
    findLatestTranscriptVersion(query: LatestTranscriptVersionQuery): Promise<TranscriptVersionRecord | undefined>;
    saveTranscriptVersion(input: SaveTranscriptVersionInput): Promise<SaveTranscriptVersionResult>;
    saveTranscriptSegments(segments: TranscriptSegmentInput[]): Promise<{ savedCount: number }>;
    findVideosMissingTranscripts(channelId: number, limit?: number): Promise<VideoNeedingTranscript[]>;
}

function resolveStubCreatorName(input: StubCreatorInput): string {
    const name = input.name.trim() || input.channelName.trim();

    if (!name) {
        throw new Error('Cannot create or reuse stub creator without name or channelName.');
    }

    return name;
}

function toStoredChannel(channel: { id: number; youtubeChannelId?: string; handle?: string }): StoredChannel {
    return {
        channelId: channel.id,
        youtubeChannelId: channel.youtubeChannelId,
        handle: channel.handle,
    };
}

function toTranscriptVersionRecord(row: TranscriptVersionRow): TranscriptVersionRecord {
    return {
        transcriptId: row.transcriptId,
        videoId: row.videoId,
        captionSource: row.captionSource,
        language: row.language,
        version: row.version,
        rawFormat: row.rawFormat,
        rawBlob: row.rawBlob,
        checksum: row.checksum,
        createdAt: row.createdAt,
    };
}

export function createProductionIngestStorage(): IngestStorage {
    const findOrCreateStubCreator = async (input: StubCreatorInput): Promise<StoredCreator> => {
        const creator = findOrCreateCreatorByName(resolveStubCreatorName(input));

        return {
            creatorId: creator.id,
            name: creator.name,
        };
    };

    return {
        findOrCreateStubCreator,

        async findOrCreateYoutubeChannel(channel, policy) {
            if (!policy.createChannel) {
                const existingChannel = findYoutubeChannelByIdentity(channel);
                return existingChannel ? toStoredChannel(existingChannel) : undefined;
            }

            const creator = await findOrCreateStubCreator({
                name: channel.name ?? '',
                channelName: channel.name ?? '',
            });
            const channelId = upsertYoutubeChannelForCreator(channel, creator.creatorId);
            const storedChannel = findYoutubeChannelByIdentity(channel);

            return toStoredChannel({
                id: channelId,
                youtubeChannelId: storedChannel?.youtubeChannelId ?? channel.youtubeChannelId,
                handle: storedChannel?.handle ?? channel.handle,
            });
        },

        async saveVideos(channelId, videos) {
            return {
                savedCount: upsertVideoInfo(channelId, videos),
            };
        },

        async findLatestTranscriptVersion(query) {
            const latest = findLatestTranscriptVersionRecord(query);
            return latest ? toTranscriptVersionRecord(latest) : undefined;
        },

        async saveTranscriptVersion(input) {
            const latest = findLatestTranscriptVersionRecord(input);
            const saved = saveTranscriptVersionRecord(input);

            return {
                ...toTranscriptVersionRecord(saved),
                isNewVersion: latest?.checksum !== input.checksum,
            };
        },

        async saveTranscriptSegments(segments) {
            return saveTranscriptSegmentRecords(segments);
        },

        async findVideosMissingTranscripts(channelId, limit) {
            return getVideosMissingTranscripts(channelId, limit);
        },
    };
}

export function createProductionIngestStorageStub(): IngestStorage {
    return createProductionIngestStorage();
}
