import { readFile } from 'fs/promises';
import { parseJson3Transcript } from '../transcripts/json3Parser';
import type { IngestModule } from './ingest.types';
import type { FutureIngestDependencies } from './ingest.dependencies';
import type {
    ChannelIngestReport,
    IngestFailure,
    IngestParserDiagnostic,
    TranscriptChannelResult,
    TranscriptIngestReport,
    VideoChannelIngestReport,
    VideoIngestReport,
} from '../types/ingestion.types';

export type CreateIngestModuleDependencies = FutureIngestDependencies;

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function createFailure(scope: IngestFailure['scope'], identifier: string, error: unknown): IngestFailure {
    return {
        scope,
        identifier,
        message: getErrorMessage(error),
    };
}

function addParserDiagnostics(
    target: { parserDiagnostics: IngestParserDiagnostic[] },
    diagnostics: Array<{ code: string; message: string; eventIndex?: number }>,
    context: {
        videoId?: number;
        youtubeVideoId: string;
        captionSource: 'manual' | 'automatic';
        language: string;
    },
): void {
    target.parserDiagnostics.push(
        ...diagnostics.map((diagnostic) => ({
            ...context,
            code: diagnostic.code,
            message: diagnostic.message,
            eventIndex: diagnostic.eventIndex,
        })),
    );
}

function createVideoChannelReport(identifier: string): VideoChannelIngestReport {
    return {
        identifier,
        videoUrlsDiscovered: 0,
        videosFetched: 0,
        videosUpserted: 0,
        batchFailures: 0,
        captionsRequested: 0,
        captionsDownloaded: 0,
        captionsMissing: 0,
        captionsFailed: 0,
        transcriptVersionsCreated: 0,
        transcriptVersionsUnchanged: 0,
        transcriptSegmentsSaved: 0,
        skippedRecords: 0,
        parserDiagnostics: [],
        failures: [],
        failed: false,
        skipped: false,
    };
}

export function createIngestModule(dependencies: CreateIngestModuleDependencies): IngestModule {
    return {
        async ingestChannelProfile(inputs, options) {
            const resolved = await dependencies.inputLoader.resolveIdentifiers(inputs);
            const report: ChannelIngestReport = {
                kind: 'channels',
                inputs,
                resolved,
                save: options.save,
                dryRun: !options.save,
                fetched: [],
                failed: [],
                savedCount: 0,
                skippedRecords: 0,
                failures: [],
            };

            for (const identifier of resolved) {
                try {
                    const channel = await dependencies.youtubeSource.fetchChannelProfile(identifier);
                    if (!channel) {
                        report.failed.push(identifier);
                        report.failures.push({
                            scope: 'channel',
                            identifier,
                            message: `Failed to ingest channel metadata for ${identifier}.`,
                        });
                        dependencies.reporter.error(`Failed to ingest channel metadata for ${identifier}.`);
                        continue;
                    }

                    report.fetched.push(channel);

                    if (options.save) {
                        await dependencies.storage.findOrCreateYoutubeChannel(channel, { createChannel: true });
                        report.savedCount += 1;
                    } else {
                        report.skippedRecords += 1;
                        dependencies.reporter.info(JSON.stringify(channel, null, 2));
                        dependencies.reporter.info('Channel not saved (use --save to store in DB).');
                    }
                } catch (error) {
                    report.failed.push(identifier);
                    report.failures.push(createFailure('channel', identifier, error));
                    dependencies.reporter.error(`Error during ingestChannelProfile for ${identifier}:`, error);
                }
            }

            return report;
        },

        async ingestChannelVideos(inputs, options) {
            const resolved = await dependencies.inputLoader.resolveIdentifiers(inputs);
            const batchSize = Math.max(1, options.batch);
            const createChannel = options.createChannel ?? false;
            const report: VideoIngestReport = {
                kind: 'videos',
                inputs,
                resolved,
                save: options.save,
                dryRun: !options.save,
                createChannel,
                limit: options.limit,
                batchSize,
                channelsTotal: resolved.length,
                channelsSucceeded: 0,
                channelsFailed: 0,
                channelsSkipped: 0,
                batchesFailed: 0,
                videosUpserted: 0,
                captionsRequested: 0,
                captionsDownloaded: 0,
                captionsMissing: 0,
                captionsFailed: 0,
                transcriptVersionsCreated: 0,
                transcriptVersionsUnchanged: 0,
                transcriptSegmentsSaved: 0,
                skippedRecords: 0,
                parserDiagnostics: [],
                failures: [],
                channelReports: [],
            };

            for (const identifier of resolved) {
                const channelReport = createVideoChannelReport(identifier);
                report.channelReports.push(channelReport);

                try {
                    const channel = await dependencies.youtubeSource.fetchChannelProfile(identifier);
                    if (!channel) {
                        channelReport.failed = true;
                        report.channelsFailed += 1;
                        const failure = {
                            scope: 'channel' as const,
                            identifier,
                            message: `Failed to ingest channel metadata for: ${identifier}`,
                        };
                        channelReport.failures.push(failure);
                        report.failures.push(failure);
                        dependencies.reporter.warn(`Failed to ingest channel metadata for: ${identifier}`);
                        continue;
                    }
                    channelReport.fetchedChannel = channel;

                    const storedChannel = options.save
                        ? await dependencies.storage.findOrCreateYoutubeChannel(channel, { createChannel })
                        : undefined;

                    if (options.save && !storedChannel) {
                        channelReport.skipped = true;
                        channelReport.skippedRecords += 1;
                        report.channelsSkipped += 1;
                        report.skippedRecords += 1;
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
                                report.captionsRequested += captionRequests.length;
                                channelReport.captionsRequested += captionRequests.length;

                                let captions;
                                try {
                                    captions = await dependencies.youtubeSource.downloadJson3Captions(
                                        captionRequests,
                                        dependencies.tempDirectoryProvider.getTempDirectory(),
                                    );
                                } catch (error) {
                                    report.captionsFailed += captionRequests.length;
                                    channelReport.captionsFailed += captionRequests.length;
                                    const failure = createFailure('caption', identifier, error);
                                    report.failures.push(failure);
                                    channelReport.failures.push(failure);
                                    dependencies.reporter.error(`Caption download failed for channel ${identifier}:`, error);
                                    continue;
                                }

                                const captionsMissing = Math.max(0, captionRequests.length - captions.length);
                                report.captionsDownloaded += captions.length;
                                report.captionsMissing += captionsMissing;
                                channelReport.captionsDownloaded += captions.length;
                                channelReport.captionsMissing += captionsMissing;

                                for (const caption of captions) {
                                    const video = savedVideos.videos.find(
                                        (storedVideo) => storedVideo.youtubeVideoId === caption.videoId,
                                    );
                                    if (!video) {
                                        report.skippedRecords += 1;
                                        channelReport.skippedRecords += 1;
                                        continue;
                                    }

                                    const rawJson3 = await readFile(caption.filePath, 'utf8');
                                    const parsed = parseJson3Transcript({ rawJson3 });
                                    addParserDiagnostics(report, parsed.diagnostics, {
                                        videoId: video.id,
                                        youtubeVideoId: video.youtubeVideoId,
                                        captionSource: caption.captionSource,
                                        language: caption.language,
                                    });
                                    addParserDiagnostics(channelReport, parsed.diagnostics, {
                                        videoId: video.id,
                                        youtubeVideoId: video.youtubeVideoId,
                                        captionSource: caption.captionSource,
                                        language: caption.language,
                                    });
                                    const transcriptVersion = await dependencies.storage.saveTranscriptVersion({
                                        videoId: video.id,
                                        captionSource: caption.captionSource,
                                        language: caption.language,
                                        rawFormat: parsed.rawFormat,
                                        rawBlob: rawJson3,
                                        checksum: parsed.checksum,
                                    });

                                    if (transcriptVersion.isNewVersion) {
                                        report.transcriptVersionsCreated += 1;
                                        channelReport.transcriptVersionsCreated += 1;
                                    } else {
                                        report.transcriptVersionsUnchanged += 1;
                                        channelReport.transcriptVersionsUnchanged += 1;
                                    }

                                    if (transcriptVersion.isNewVersion && parsed.segments.length > 0) {
                                        const savedSegments = await dependencies.storage.saveTranscriptSegments(
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
                                        report.transcriptSegmentsSaved += savedSegments.savedCount;
                                        channelReport.transcriptSegmentsSaved += savedSegments.savedCount;
                                    }
                                }
                            } else {
                                report.skippedRecords += videos.length;
                                channelReport.skippedRecords += videos.length;
                            }
                        } catch (error) {
                            channelReport.batchFailures += 1;
                            report.batchesFailed += 1;
                            const failure = createFailure('video-page', `${identifier}:${playlistStart}`, error);
                            channelReport.failures.push(failure);
                            report.failures.push(failure);
                            dependencies.reporter.error(`Batch failed for channel ${identifier} at page starting ${playlistStart}:`, error);
                        }
                    }

                    report.channelsSucceeded += 1;
                } catch (error) {
                    channelReport.failed = true;
                    report.channelsFailed += 1;
                    const failure = createFailure('channel', identifier, error);
                    channelReport.failures.push(failure);
                    report.failures.push(failure);
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
                dryRun: !options.save,
                limit: options.limit,
                channelsProcessed: resolved.length,
                missingChannels: [],
                transcriptsFetched: 0,
                transcriptsStored: 0,
                captionsRequested: 0,
                captionsDownloaded: 0,
                captionsMissing: 0,
                captionsFailed: 0,
                transcriptVersionsCreated: 0,
                transcriptVersionsUnchanged: 0,
                transcriptSegmentsSaved: 0,
                skippedRecords: 0,
                parserDiagnostics: [],
                failures: [],
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
                        report.skippedRecords += 1;
                        dependencies.reporter.error(`Channel "${identifier}" not found in the database. Please add its channel metadata first using ingest-channel-profile.`);
                        continue;
                    }

                    const videos = await dependencies.storage.findVideosMissingTranscripts(channel.channelId, options.limit);
                    if (videos.length === 0) {
                        report.skippedRecords += 1;
                        dependencies.reporter.info(`No videos found missing transcripts for ${identifier} within the specified limit.`);
                        continue;
                    }

                    const captionRequests = videos.map((video) => ({
                        videoId: video.youtubeVideoId,
                        language: 'en',
                        preferManual: true,
                    }));
                    report.captionsRequested += captionRequests.length;

                    let captions;
                    try {
                        captions = await dependencies.youtubeSource.downloadJson3Captions(
                            captionRequests,
                            dependencies.tempDirectoryProvider.getTempDirectory(),
                        );
                    } catch (error) {
                        report.captionsFailed += captionRequests.length;
                        report.failures.push(createFailure('caption', identifier, error));
                        dependencies.reporter.error(`Caption download failed for channel ${identifier}:`, error);
                        continue;
                    }

                    report.captionsDownloaded += captions.length;
                    report.captionsMissing += Math.max(0, captionRequests.length - captions.length);
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
                        addParserDiagnostics(report, parsed.diagnostics, {
                            videoId: video.id,
                            youtubeVideoId: video.youtubeVideoId,
                            captionSource: caption.captionSource,
                            language: caption.language,
                        });
                        result.transcripts.push({
                            videoId: video.id,
                            youtubeVideoId: video.youtubeVideoId,
                            captionSource: caption.captionSource,
                            language: caption.language,
                            segmentCount: parsed.segments.length,
                        });
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
                                report.transcriptVersionsCreated += 1;
                                result.transcripts[result.transcripts.length - 1]!.transcriptVersionCreated = true;
                            } else {
                                report.transcriptVersionsUnchanged += 1;
                                result.transcripts[result.transcripts.length - 1]!.transcriptVersionCreated = false;
                            }

                            if (transcriptVersion.isNewVersion && parsed.segments.length > 0) {
                                const savedSegments = await dependencies.storage.saveTranscriptSegments(
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
                                report.transcriptSegmentsSaved += savedSegments.savedCount;
                            }
                        }
                    }
                } catch (error) {
                    report.failures.push(createFailure('channel', identifier, error));
                    dependencies.reporter.error(`Error during ingestTranscripts for ${identifier}:`, error);
                }
            }

            return report;
        },
    };
}
