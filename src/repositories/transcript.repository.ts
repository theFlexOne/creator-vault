import { createHash } from 'crypto';
import db from '../lib/sqlite/db';
import { logger } from '../shared/logger';
import type { TranscriptDTO } from '../domain/transcript/transcript.types';

// Since the transcript feature was partially commented-out in the original codebase,
// we export the clean repository methods here for complete structural alignment.

export type TranscriptVersionQuery = {
    videoId: number;
    captionSource: 'manual' | 'automatic';
    language: string;
};

export type SaveTranscriptVersionInput = TranscriptVersionQuery & {
    rawFormat: 'json3';
    rawBlob: string;
    checksum: string;
};

export type TranscriptVersionRow = SaveTranscriptVersionInput & {
    transcriptId: number;
    version: number;
    createdAt: string;
};

export type SaveTranscriptSegmentInput = {
    transcriptId: number;
    idx: number;
    startMs: number;
    endMs: number;
    text: string;
    speaker?: string;
    confidence?: number;
};

const latestTranscriptVersion = db.prepare(`
    SELECT
        id AS transcriptId,
        video_id AS videoId,
        caption_source AS captionSource,
        language,
        version,
        raw_format AS rawFormat,
        raw_blob AS rawBlob,
        checksum,
        created_at AS createdAt
    FROM transcripts
    WHERE video_id = @videoId
        AND caption_source = @captionSource
        AND language = @language
    ORDER BY version DESC
    LIMIT 1
`);

const insertTranscriptVersion = db.prepare(`
    INSERT INTO transcripts (
        video_id,
        caption_source,
        language,
        version,
        raw_format,
        raw_blob,
        checksum
    )
    VALUES (
        @videoId,
        @captionSource,
        @language,
        @version,
        @rawFormat,
        @rawBlob,
        @checksum
    )
    RETURNING
        id AS transcriptId,
        video_id AS videoId,
        caption_source AS captionSource,
        language,
        version,
        raw_format AS rawFormat,
        raw_blob AS rawBlob,
        checksum,
        created_at AS createdAt
`);

const insertTranscriptSegment = db.prepare(`
    INSERT INTO transcript_segments (
        transcript_id,
        idx,
        start_ms,
        end_ms,
        text,
        speaker,
        confidence
    )
    VALUES (
        @transcriptId,
        @idx,
        @startMs,
        @endMs,
        @text,
        @speaker,
        @confidence
    )
`);

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

export function findLatestTranscriptVersion(
    query: TranscriptVersionQuery,
): TranscriptVersionRow | undefined {
    return latestTranscriptVersion.get(query) as TranscriptVersionRow | undefined;
}

export function saveTranscriptVersion(input: SaveTranscriptVersionInput): TranscriptVersionRow {
    const latest = findLatestTranscriptVersion(input);

    if (latest?.checksum === input.checksum) {
        return latest;
    }

    const row = insertTranscriptVersion.get({
        ...input,
        version: (latest?.version ?? 0) + 1,
    }) as TranscriptVersionRow | undefined;

    if (!row) {
        throw new Error(`Failed to save transcript version for video ${input.videoId}.`);
    }

    return row;
}

export function saveTranscriptSegments(segments: SaveTranscriptSegmentInput[]): { savedCount: number } {
    const insertManySegments = db.transaction((segmentList: SaveTranscriptSegmentInput[]) => {
        let count = 0;

        for (const segment of segmentList) {
            insertTranscriptSegment.run({
                ...segment,
                speaker: segment.speaker ?? null,
                confidence: segment.confidence ?? null,
            });
            count++;
        }

        return count;
    });

    return { savedCount: insertManySegments(segments) };
}

export function upsertTranscriptData(transcripts: TranscriptDTO[]): number {
    const saveManyTranscripts = db.transaction((transcriptList: TranscriptDTO[]) => {
        let count = 0;

        for (const transcript of transcriptList) {
            if (transcript.videoId === undefined) {
                continue;
            }

            const rawBlob = transcript.text ?? transcript.transcript ?? '';
            const latest = findLatestTranscriptVersion({
                videoId: transcript.videoId,
                captionSource: 'automatic',
                language: 'en',
            });
            const checksum = sha256(rawBlob);

            if (latest?.checksum === checksum) {
                continue;
            }

            saveTranscriptVersion({
                videoId: transcript.videoId,
                captionSource: 'automatic',
                language: 'en',
                rawFormat: 'json3',
                rawBlob,
                checksum,
            });
            count++;
        }

        return count;
    });

    const storedCount = saveManyTranscripts(transcripts);
    logger.info(`Successfully stored ${storedCount} transcripts.`);
    return storedCount;
}
