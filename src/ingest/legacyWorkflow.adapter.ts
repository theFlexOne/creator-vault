import { runIngestChannelProfileWorkflow } from '../services/ingestChannelProfile.service';
import { runIngestChannelVideosWorkflow } from '../services/ingestChannelVideos.service';
import { runIngestTranscriptsWorkflow } from '../services/ingestTranscripts.service';
import type { IngestModule } from './ingest.types';

export function createLegacyWorkflowIngestAdapter(): IngestModule {
    return {
        ingestChannelProfile(inputs, options) {
            return runIngestChannelProfileWorkflow(inputs, options.save);
        },

        ingestChannelVideos(inputs, options) {
            // TODO(ingest): Replace per-video metadata fanout with chunked /videos retrieval.
            // TODO(ingest): Add missing-channel creation and transcript ingestion to this workflow.
            return runIngestChannelVideosWorkflow(inputs, options.limit, options.save, options.batch);
        },

        ingestTranscripts(inputs, options) {
            // TODO(ingest): Download json3 captions, parse segments, and persist transcript versions.
            return runIngestTranscriptsWorkflow(inputs, options.limit, options.save);
        },
    };
}
