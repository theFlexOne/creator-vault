import { tmpdir } from 'os';
import { resolveCliInputIdentifiers } from '../cli/input';
import { logger } from '../shared/logger';
import { createProductionIngestStorageStub } from './ingestStorage';
import { createProductionYoutubeSourceStub } from './youtubeSource';
import type { IngestStorage } from './ingestStorage';
import type { YoutubeSource } from './youtubeSource';

export type IngestInputLoader = {
    resolveIdentifiers(inputs: string[]): Promise<string[]>;
};

export type TempDirectoryProvider = {
    getTempDirectory(): string;
};

export type IngestReporter = {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
};

export type FutureIngestDependencies = {
    inputLoader: IngestInputLoader;
    youtubeSource: YoutubeSource;
    storage: IngestStorage;
    tempDirectoryProvider: TempDirectoryProvider;
    reporter: IngestReporter;
};

export function createDefaultFutureIngestDependencies(): FutureIngestDependencies {
    return {
        inputLoader: {
            resolveIdentifiers: resolveCliInputIdentifiers,
        },
        youtubeSource: createProductionYoutubeSourceStub(),
        storage: createProductionIngestStorageStub(),
        tempDirectoryProvider: {
            getTempDirectory: tmpdir,
        },
        reporter: logger,
    };
}
