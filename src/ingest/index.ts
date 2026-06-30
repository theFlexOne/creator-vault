import { createIngestModule } from './ingest.module';
import { createDefaultFutureIngestDependencies } from './ingest.dependencies';
import { createLegacyWorkflowIngestAdapter } from './legacyWorkflow.adapter';

export type {
    IngestChannelProfileOptions,
    IngestChannelVideosOptions,
    IngestModule,
    IngestTranscriptsOptions,
} from './ingest.types';
export type {
    FutureIngestDependencies,
    IngestInputLoader,
    IngestReporter,
    TempDirectoryProvider,
} from './ingest.dependencies';
export type {
    ChannelVideosPage,
    ChannelVideosPageRange,
    DownloadedJson3Caption,
    Json3CaptionRequest,
    YoutubeSource,
} from './youtubeSource';
export type {
    IngestStorage,
    LatestTranscriptVersionQuery,
    MissingChannelPolicy,
    SaveTranscriptVersionResult,
    SaveTranscriptVersionInput,
    SaveVideosResult,
    StoredChannel,
    StoredCreator,
    StubCreatorInput,
    TranscriptSegmentInput,
    TranscriptVersionRecord,
    VideoNeedingTranscript,
} from './ingestStorage';
export { createIngestModule } from './ingest.module';
export { createDefaultFutureIngestDependencies } from './ingest.dependencies';
export { createLegacyWorkflowIngestAdapter } from './legacyWorkflow.adapter';
export { createProductionYoutubeSource, createProductionYoutubeSourceStub } from './youtubeSource';
export { createProductionIngestStorage, createProductionIngestStorageStub } from './ingestStorage';

const defaultIngestModule = createIngestModule({
    ...createDefaultFutureIngestDependencies(),
    legacyWorkflowAdapter: createLegacyWorkflowIngestAdapter(),
});

export function runIngestChannelProfile(inputs: string[], save: boolean) {
    return defaultIngestModule.ingestChannelProfile(inputs, { save });
}

export function runIngestChannelVideos(inputs: string[], limit: number, save: boolean, batch: number) {
    return defaultIngestModule.ingestChannelVideos(inputs, { limit, save, batch });
}

export function runIngestTranscripts(inputs: string[], limit: number, save: boolean) {
    return defaultIngestModule.ingestTranscripts(inputs, { limit, save });
}
