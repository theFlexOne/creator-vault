import { readFile } from 'fs/promises';
import { parseJson3Transcript } from '../transcripts/json3Parser';
import type { IngestModule } from './ingest.types';
import type { FutureIngestDependencies } from './ingest.dependencies';
import type {
    ChannelIngestReport,
    TranscriptChannelResult,
    TranscriptIngestReport,
    VideoChannelIngestReport,
    VideoIngestReport,
} from '../types/ingestion.types';

export type CreateIngestModuleDependencies = FutureIngestDependencies;

export function createIngestModule(dependencies: CreateIngestModuleDependencies): IngestModule {
    return {
        async ingestChannelProfile(inputs, options) {
            const resolved = await dependencies.inputLoader.resolveIdentifiers(inputs);
            const report: ChannelIngestReport = {
                kind: 'channels',
                inputs,
                resolved,
                save: options.save,
                fetched: [],
                failed: [],
                savedCount: 0,
            };

            for (const identifier of resolved) {
                try {
                    const channel = await dependencies.youtubeSource.fetchChannelProfile(identifier);
                    if (!channel) {
                        report.failed.push(identifier);
                        dependencies.reporter.error(`Failed to ingest channel profile for ${identifier}.`);
                        continue;
                    }

                    report.fetched.push(channel);

                    if (options.save) {
                        await dependencies.storage.findOrCreateYoutubeChannel(channel, { createChannel: true });
                        report.savedCount += 1;
                    } else {
                        dependencies.reporter.info(JSON.stringify(channel, null, 2));
                        dependencies.reporter.info('Channel not saved (use --save to store in DB).');
                    }
                } catch (error) {
                    report.failed.push(identifier);
                    dependencies.reporter.error(`Error during ingestChannelProfile for ${identifier}:`, error);
                }
            }

            return report;
        },

        async ingestChannelVideos(inputs, options) {
            const resolved = await dependencies.inputLoader.resolveIdentifiers(inputs);
            const batchSize = Math.max(1, options.batch);
            const report: VideoIngestReport = {
                kind: 'videos',
                inputs,
                resolved,
                save: options.save,
                limit: options.limit,
                batchSize,
                channelsTotal: resolved.length,
                channelsSucceeded: 0,
                channelsFailed: 0,
                batchesFailed: 0,
                videosUpserted: 0,
                channelReports: [],
            };

            for (const identifier of resolved) {
                const channelReport: VideoChannelIngestReport = {
                    identifier,
                    videoUrlsDiscovered: 0,
                    videosFetched: 0,
                    videosUpserted: 0,
                    batchFailures: 0,
                    failed: false,
                };
                report.channelReports.push(channelReport);

                try {
                    const channel = await dependencies.youtubeSource.fetchChannelProfile(identifier);
                    if (!channel) {
                        channelReport.failed = true;
                        report.channelsFailed += 1;
                        dependencies.reporter.warn(`Failed to ingest channel profile for: ${identifier}`);
                        continue;
                    }
                    channelReport.fetchedChannel = channel;

                    const storedChannel = options.save
                        ? await dependencies.storage.findOrCreateYoutubeChannel(channel, { createChannel: true })
                        : undefined;

                    if (options.save && !storedChannel) {
                        channelReport.failed = true;
                        report.channelsFailed += 1;
                        dependencies.reporter.warn(`Channel not found in DB: ${identifier}. Skipping.`);
                        continue;
                    }

                    for (let playlistStart = 1; playlistStart <= options.limit; playlistStart += batchSize) {
                        const playlistEnd = Math.min(playlistStart + batchSize - 1, options.limit);

                        try {
                            const page = await dependencies.youtubeSource.fetchChannelVideosPage(identifier, {
                                playlistStart,
                                playlistEnd,
                            });
                            const videos = page.videos;
                            channelReport.videoUrlsDiscovered += videos.length;
                            channelReport.videosFetched += videos.length;

                            if (videos.length === 0) {
                                break;
                            }

                            if (options.save && storedChannel) {
                                const savedVideos = await dependencies.storage.saveVideos(storedChannel.channelId, videos);
                                report.videosUpserted += savedVideos.savedCount;
                                channelReport.videosUpserted += savedVideos.savedCount;

                                const captionRequests = savedVideos.videos.map((video) => ({
                                    videoId: video.youtubeVideoId,
                                    language: 'en',
                                    preferManual: true,
                                }));
                                const captions = await dependencies.youtubeSource.downloadJson3Captions(
                                    captionRequests,
                                    dependencies.tempDirectoryProvider.getTempDirectory(),
                                );

                                for (const caption of captions) {
                                    const video = savedVideos.videos.find(
                                        (storedVideo) => storedVideo.youtubeVideoId === caption.videoId,
                                    );
                                    if (!video) {
                                        continue;
                                    }

                                    const rawJson3 = await readFile(caption.filePath, 'utf8');
                                    const parsed = parseJson3Transcript({ rawJson3 });
                                    const transcriptVersion = await dependencies.storage.saveTranscriptVersion({
                                        videoId: video.id,
                                        captionSource: caption.captionSource,
                                        language: caption.language,
                                        rawFormat: parsed.rawFormat,
                                        rawBlob: rawJson3,
                                        checksum: parsed.checksum,
                                    });

                                    if (transcriptVersion.isNewVersion && parsed.segments.length > 0) {
                                        await dependencies.storage.saveTranscriptSegments(
                                            parsed.segments.map((segment) => ({
                                                transcriptId: transcriptVersion.transcriptId,
                                                idx: segment.idx,
                                                startMs: segment.startMs,
                                                endMs: segment.endMs,
                                                text: segment.text,
                                                speaker: segment.speaker,
                                                confidence: segment.confidence,
                                            })),
                                        );
                                    }
                                }
                            }
                        } catch (error) {
                            channelReport.batchFailures += 1;
                            report.batchesFailed += 1;
                            dependencies.reporter.error(`Batch failed for channel ${identifier} at page starting ${playlistStart}:`, error);
                        }
                    }

                    report.channelsSucceeded += 1;
                } catch (error) {
                    channelReport.failed = true;
                    report.channelsFailed += 1;
                    dependencies.reporter.error(`Channel failed for ${identifier}:`, error);
                }
            }

            return report;
        },

        async ingestTranscripts(inputs, options) {
            const resolved = await dependencies.inputLoader.resolveIdentifiers(inputs);
            const report: TranscriptIngestReport = {
                kind: 'transcripts',
                inputs,
                resolved,
                save: options.save,
                limit: options.limit,
                channelsProcessed: resolved.length,
                missingChannels: [],
                transcriptsFetched: 0,
                transcriptsStored: 0,
                results: [],
            };

            for (const identifier of resolved) {
                try {
                    const channel = await dependencies.storage.findOrCreateYoutubeChannel({
                        youtubeChannelId: identifier,
                        handle: identifier,
                    }, { createChannel: false });

                    if (!channel) {
                        report.missingChannels.push(identifier);
                        dependencies.reporter.error(`Channel "${identifier}" not found in the database. Please add it first using ingest-channel-profile.`);
                        continue;
                    }

                    const videos = await dependencies.storage.findVideosMissingTranscripts(channel.channelId, options.limit);
                    if (videos.length === 0) {
                        dependencies.reporter.info(`No videos found missing transcripts for ${identifier} within the specified limit.`);
                        continue;
                    }

                    const captions = await dependencies.youtubeSource.downloadJson3Captions(
                        videos.map((video) => ({
                            videoId: video.youtubeVideoId,
                            language: 'en',
                            preferManual: true,
                        })),
                        dependencies.tempDirectoryProvider.getTempDirectory(),
                    );
                    const result: TranscriptChannelResult = {
                        channel: identifier,
                        transcripts: [],
                    };
                    report.results.push(result);

                    for (const caption of captions) {
                        const video = videos.find((candidate) => candidate.youtubeVideoId === caption.videoId);
                        if (!video) {
                            continue;
                        }

                        const rawJson3 = await readFile(caption.filePath, 'utf8');
                        const parsed = parseJson3Transcript({ rawJson3 });
                        result.transcripts.push({ videoId: video.id, transcript: rawJson3 });
                        report.transcriptsFetched += 1;

                        if (options.save) {
                            const transcriptVersion = await dependencies.storage.saveTranscriptVersion({
                                videoId: video.id,
                                captionSource: caption.captionSource,
                                language: caption.language,
                                rawFormat: parsed.rawFormat,
                                rawBlob: rawJson3,
                                checksum: parsed.checksum,
                            });

                            if (transcriptVersion.isNewVersion) {
                                report.transcriptsStored += 1;
                            }

                            if (transcriptVersion.isNewVersion && parsed.segments.length > 0) {
                                await dependencies.storage.saveTranscriptSegments(
                                    parsed.segments.map((segment) => ({
                                        transcriptId: transcriptVersion.transcriptId,
                                        idx: segment.idx,
                                        startMs: segment.startMs,
                                        endMs: segment.endMs,
                                        text: segment.text,
                                        speaker: segment.speaker,
                                        confidence: segment.confidence,
                                    })),
                                );
                            }
                        }
                    }
                } catch (error) {
                    dependencies.reporter.error(`Error during ingestTranscripts for ${identifier}:`, error);
                }
            }

            return report;
        },
    };
}
