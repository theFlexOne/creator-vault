import { writeFile } from 'fs/promises';
import { join } from 'path';
import youtubedl from 'youtube-dl-exec';
import normalizeYoutubeUrl from '../lib/youtube/normalizeYoutubeUrl';
import type { ChannelRecord, VideoRecord } from '../types/ingestion.types';

export const DEFAULT_CHANNEL_VIDEOS_PAGE_SIZE = 10;

export type ChannelVideosPageRange = {
    playlistStart?: number;
    playlistEnd?: number;
};

export type ChannelVideosPage = {
    channelInput: string;
    pageRange: ChannelVideosPageRange;
    videos: VideoRecord[];
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

type YoutubeCaptionTrack = {
    ext?: string;
    url?: string;
};

type YoutubePayload = {
    id?: string;
    title?: string;
    channel?: string;
    channel_id?: string;
    channel_url?: string;
    uploader_id?: string;
    uploader_url?: string;
    url?: string;
    webpage_url?: string;
    description?: string;
    tags?: string[];
    channel_follower_count?: number;
    entries?: YoutubePayload[];
    duration?: number;
    upload_date?: string;
    view_count?: number;
    categories?: string[];
    subtitles?: Record<string, YoutubeCaptionTrack[]>;
    automatic_captions?: Record<string, YoutubeCaptionTrack[]>;
};

type SelectedCaption = {
    captionSource: 'manual' | 'automatic';
    track: YoutubeCaptionTrack;
};

function normalizeChannelRoot(input: string): string {
    return normalizeYoutubeUrl(input).replace(/\/videos\/?$/, '');
}

function normalizeChannelVideosUrl(input: string): string {
    return `${normalizeChannelRoot(input)}/videos`;
}

function mapChannelRecord(payload: YoutubePayload): ChannelRecord {
    return {
        handle: payload.uploader_id ?? payload.id,
        youtubeChannelId: payload.channel_id,
        name: payload.channel ?? payload.title,
        url: payload.channel_url ?? payload.uploader_url ?? payload.webpage_url,
        description: payload.description,
        tags: payload.tags,
        followers: payload.channel_follower_count,
    };
}

function mapVideoRecord(entry: YoutubePayload): VideoRecord | undefined {
    if (!entry.id) {
        return undefined;
    }

    return {
        youtubeVideoId: entry.id,
        title: entry.title,
        url: entry.webpage_url ?? entry.url ?? `https://www.youtube.com/watch?v=${entry.id}`,
        description: entry.description,
        duration: entry.duration,
        uploadDate: entry.upload_date,
        viewCount: entry.view_count,
        categories: entry.categories,
        tags: entry.tags,
    };
}

function findJson3Track(
    captions: Record<string, YoutubeCaptionTrack[]> | undefined,
    language: string,
): YoutubeCaptionTrack | undefined {
    return captions?.[language]?.find((caption) => caption.ext === 'json3' && caption.url);
}

function selectCaption(
    payload: YoutubePayload,
    language: string,
    preferManual: boolean,
): SelectedCaption | undefined {
    const manual = findJson3Track(payload.subtitles, language);
    const automatic = findJson3Track(payload.automatic_captions, language);

    if (preferManual) {
        return manual
            ? { captionSource: 'manual', track: manual }
            : automatic
              ? { captionSource: 'automatic', track: automatic }
              : undefined;
    }

    return automatic
        ? { captionSource: 'automatic', track: automatic }
        : manual
          ? { captionSource: 'manual', track: manual }
          : undefined;
}

export function createProductionYoutubeSource(): YoutubeSource {
    return {
        async fetchChannelProfile(input) {
            const output = await youtubedl(normalizeChannelRoot(input), {
                dumpSingleJson: true,
                skipDownload: true,
                flatPlaylist: true,
                playlistItems: '0',
            }) as YoutubePayload;

            return mapChannelRecord(output);
        },

        async fetchChannelVideosPage(input, pageRange) {
            const output = await youtubedl(normalizeChannelVideosUrl(input), {
                dumpSingleJson: true,
                skipDownload: true,
                flatPlaylist: false,
                playlistStart: pageRange.playlistStart,
                playlistEnd: pageRange.playlistEnd,
            }) as YoutubePayload;

            return {
                channelInput: input,
                pageRange,
                videos: (output.entries ?? []).map(mapVideoRecord).filter((video): video is VideoRecord => Boolean(video)),
            };
        },

        async downloadJson3Captions(requests, tempDir) {
            const downloaded: DownloadedJson3Caption[] = [];

            for (const request of requests) {
                const output = await youtubedl(`https://www.youtube.com/watch?v=${request.videoId}`, {
                    dumpSingleJson: true,
                    skipDownload: true,
                }) as YoutubePayload;
                const selected = selectCaption(output, request.language, request.preferManual);

                if (!selected?.track.url) {
                    continue;
                }

                const response = await fetch(selected.track.url);
                if (!response.ok) {
                    throw new Error(`Failed to download json3 captions for video ${request.videoId}.`);
                }

                const filePath = join(
                    tempDir,
                    `${request.videoId}.${selected.captionSource}.${request.language}.json3`,
                );
                await writeFile(filePath, new Uint8Array(await response.arrayBuffer()));
                downloaded.push({
                    videoId: request.videoId,
                    language: request.language,
                    captionSource: selected.captionSource,
                    filePath,
                });
            }

            return downloaded;
        },
    };
}

export function createProductionYoutubeSourceStub(): YoutubeSource {
    return createProductionYoutubeSource();
}
