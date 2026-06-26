import type { ChannelRecord } from '../types/ingestion.types';

export type ChannelVideosPageRange = {
    playlistStart?: number;
    playlistEnd?: number;
};

export type ChannelVideosPage = {
    channelInput: string;
    pageRange: ChannelVideosPageRange;
    // TODO(ingest): Replace URLs with one-request /videos metadata records.
    videoUrls: string[];
};

export type Json3CaptionRequest = {
    videoId: string;
    language: string;
    preferManual: boolean;
};

export type DownloadedJson3Caption = {
    videoId: string;
    language: string;
    captionSource: 'manual' | 'automatic';
    filePath: string;
};

export interface YoutubeSource {
    fetchChannelProfile(input: string): Promise<ChannelRecord | undefined>;
    fetchChannelVideosPage(input: string, pageRange: ChannelVideosPageRange): Promise<ChannelVideosPage>;
    downloadJson3Captions(
        requests: Json3CaptionRequest[],
        tempDir: string,
    ): Promise<DownloadedJson3Caption[]>;
}

export function createProductionYoutubeSourceStub(): YoutubeSource {
    return {
        async fetchChannelProfile() {
            throw new Error('TODO: wire production YouTube source for channel profile retrieval');
        },

        async fetchChannelVideosPage(input, pageRange) {
            // TODO(ingest): Use /videos with dumpSingleJson=true, skipDownload=true, flatPlaylist=false.
            // TODO(ingest): Use playlistStart / playlistEnd once chunk-size policy is finalized.
            return {
                channelInput: input,
                pageRange,
                videoUrls: [],
            };
        },

        async downloadJson3Captions() {
            // TODO(ingest): Prefer manual English json3 captions, then fall back to automatic English captions.
            // TODO(ingest): Download captions into a temp directory for parser + storage ingestion.
            throw new Error('TODO: wire production YouTube source for json3 caption download');
        },
    };
}
