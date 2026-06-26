import db from '../lib/sqlite/db';
import { logger } from '../shared/logger';
import type { TranscriptDTO } from '../domain/transcript/transcript.types';

// Since the transcript feature was partially commented-out in the original codebase,
// we export the clean repository methods here for complete structural alignment.

const upsertTranscript = db.prepare(`
    INSERT INTO transcripts (video_id, text)
    VALUES (?, ?)
    ON CONFLICT(video_id) DO UPDATE SET
        text = excluded.text
`);

export function upsertTranscriptData(transcripts: TranscriptDTO[]): number {
    const insertManyTranscripts = db.transaction((transcriptList: TranscriptDTO[]) => {
        let count = 0;
        for (const t of transcriptList) {
            upsertTranscript.run(t.videoId, t.text ?? t.transcript ?? '');
            count++;
        }
        return count;
    });

    const storedCount = insertManyTranscripts(transcripts);
    logger.info(`Successfully stored ${storedCount} transcripts.`);
    return storedCount;
}
