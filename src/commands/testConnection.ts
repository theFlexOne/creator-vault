import { CommandModule } from 'yargs';
import { logger } from '../logger';
import { db } from '../db';
import youtubedl from 'youtube-dl-exec';

const testConnection: CommandModule = {
    command: 'test-connection',
    describe: 'Verify database and yt-dlp configuration',
    handler: async () => {
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

        // 2. Test yt-dlp
        try {
            // Check version to see if executable works
            const version = await youtubedl('--version');
            logger.info(`✔ yt-dlp: Executable found (Version: ${String(version).trim()}).`);
        } catch (error) {
            logger.error(`✖ yt-dlp: Executable not found or failed. ${error}`);
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
    },
};

export default testConnection;
