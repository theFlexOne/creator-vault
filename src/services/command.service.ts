import { resolveCliInputIdentifiers } from '../cli/input';

/**
 * Resolves a list of identifiers (URLs, handles, etc.) from either
 * a direct list of arguments or a file path if a single argument resolves to an existing file.
 */
export async function resolveIdentifiers(args: string[]): Promise<string[]> {
    // TODO(ingest): Remove this compatibility wrapper after service renaming is complete.
    return resolveCliInputIdentifiers(args);
}
