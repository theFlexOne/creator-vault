import fs from 'fs';
import { logger } from '../logger';

/**
 * Normalizes a string (URL, handle, or ID) into a full YouTube URL pointing to the videos tab.
 */
export function normalizeYoutubeUrl(input: string): string {
    let url = input.trim();
    if (!url.startsWith('http')) {
        if (url.startsWith('UC')) {
            url = `https://www.youtube.com/channel/${url}`;
        } else if (url.startsWith('@')) {
            url = `https://www.youtube.com/${url}`;
        } else {
            url = `https://www.youtube.com/@${url}`;
        }
    }
    
    // Ensure it points to /videos to get individual video entries in flat-playlist
    if (url.includes('youtube.com/') && !url.includes('/videos') && !url.includes('watch?v=')) {
        url = url.replace(/\/$/, '') + '/videos';
    }
    
    return url;
}

/**
 * Resolves a list of identifiers (URLs, handles, etc.) from either
 * a direct list of arguments or a file path if a single argument resolves to an existing file.
 */
export async function resolveIdentifiers(args: string[]): Promise<string[]> {
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
            const data = JSON.parse(content);
            // If it's the specific christian_yt_channel_list structure, extract links
            if (data.channels && Array.isArray(data.channels)) {
                return data.channels.map((c: any) => c.link || c.handle).filter(Boolean);
            }
            // If it's a generic array of strings
            if (Array.isArray(data)) {
                return data;
            }
        }
        // Fallback for plain text files (one identifier per line)
        return content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    } catch (error) {
        logger.error(`Error reading file ${firstArg}: ${error}`);
        return [];
    }
}
