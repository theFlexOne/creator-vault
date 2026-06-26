import type { IngestModule } from './ingest.types';
import type { FutureIngestDependencies } from './ingest.dependencies';

export type CreateIngestModuleDependencies = FutureIngestDependencies & {
    legacyWorkflowAdapter: IngestModule;
};

export function createIngestModule(dependencies: CreateIngestModuleDependencies): IngestModule {
    const { legacyWorkflowAdapter } = dependencies;

    return {
        async ingestChannelProfile(inputs, options) {
            // TODO(ingest): Replace legacy delegation with direct source + storage orchestration.
            // Future implementation should use dependencies.inputLoader, youtubeSource, storage, and reporter here.
            return legacyWorkflowAdapter.ingestChannelProfile(inputs, options);
        },

        async ingestChannelVideos(inputs, options) {
            // TODO(ingest): Eventually include profile, video metadata, and transcript ingestion in one workflow.
            // Future implementation should use dependencies.tempDirectoryProvider for json3 caption staging.
            return legacyWorkflowAdapter.ingestChannelVideos(inputs, options);
        },

        async ingestTranscripts(inputs, options) {
            // TODO(ingest): Keep this independent from video metadata ingestion for transcript backfills.
            return legacyWorkflowAdapter.ingestTranscripts(inputs, options);
        },
    };
}
