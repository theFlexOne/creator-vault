import { logger } from '../shared/logger';
import db from '../lib/sqlite/db';
import youtubedl from 'youtube-dl-exec';

export async function runTestConnection(): Promise<void> {
    logger.info('Running diagnostic tests...');

    // 1. Test Database
    try {
        const result = db.prepare('SELECT 1 as connected').get() as { connected: number };
        if (result.connected === 1) {
            logger.info('✔ Database: Connected successfully.');
        }
    } catch (error) {
        logger.error(`✖ Database: Connection failed. ${error}`);
    }

    // 2. Test YouTube downloader
    try {
        // Check version to see if executable works
        const version = await youtubedl('--version');
        logger.info(`✔ YouTube downloader: Executable found (Version: ${String(version).trim()}).`);
    } catch (error) {
        logger.error(`✖ YouTube downloader: Executable not found or failed. ${error}`);
    }

    // 3. Test Network (optional but helpful)
    try {
        await youtubedl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
            dumpSingleJson: true,
            noWarnings: true,
            simulate: true,
        });
        logger.info('✔ Network: Successfully reached YouTube.');
    } catch (error) {
        logger.warn(`⚠ Network: Failed to reach YouTube (this might be expected in some environments). ${error}`);
    }

    logger.info('Diagnostics complete.');
}
