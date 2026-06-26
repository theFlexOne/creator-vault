import fs from 'fs';
import { logger } from '../shared/logger';

type ChannelListInput = {
    channels: Array<{
        link?: unknown;
        handle?: unknown;
    }>;
};

function isChannelListInput(value: unknown): value is ChannelListInput {
    return (
        typeof value === 'object' &&
        value !== null &&
        'channels' in value &&
        Array.isArray((value as ChannelListInput).channels)
    );
}

function extractChannelListIdentifiers(data: ChannelListInput): string[] {
    return data.channels
        .map((channel) => {
            if (typeof channel.link === 'string') {
                return channel.link;
            }

            if (typeof channel.handle === 'string') {
                return channel.handle;
            }

            return undefined;
        })
        .filter((identifier): identifier is string => Boolean(identifier));
}

/**
 * Resolves direct CLI identifiers or expands a single .txt/.json input file.
 */
export async function resolveCliInputIdentifiers(args: string[]): Promise<string[]> {
    if (args.length === 0) {
        return args;
    }

    if (args.length !== 1 || !fs.existsSync(args[0]!)) {
        return args;
    }

    const firstArg = args[0]!;

    try {
        const content = fs.readFileSync(firstArg, 'utf-8');
        if (firstArg.endsWith('.json')) {
            const data: unknown = JSON.parse(content);

            if (isChannelListInput(data)) {
                return extractChannelListIdentifiers(data);
            }

            if (Array.isArray(data)) {
                return data as string[];
            }
        }

        return content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    } catch (error) {
        logger.error(`Error reading file ${firstArg}: ${error}`);
        return [];
    }
}
