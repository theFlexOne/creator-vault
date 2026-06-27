import { createHash } from 'crypto';

export type Json3TranscriptParserInput = {
    rawJson3: string;
};

export type TranscriptSegment = {
    idx: number;
    startMs: number;
    endMs: number;
    text: string;
    speaker?: string;
    confidence?: number;
};

export type Json3ParserDiagnostic = {
    code: 'INVALID_JSON' | 'INVALID_ROOT' | 'EMPTY_EVENT' | 'MISSING_TIMING' | 'UNSUPPORTED_EVENT';
    message: string;
    eventIndex?: number;
};

export type Json3TranscriptParserResult = {
    rawFormat: 'json3';
    checksum: string;
    segments: TranscriptSegment[];
    diagnostics: Json3ParserDiagnostic[];
};

type Json3Event = {
    tStartMs?: unknown;
    dDurationMs?: unknown;
    segs?: unknown;
};

type Json3Segment = {
    utf8?: unknown;
};

function sha256(value: string): string {
    return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function collapseTextRuns(segs: unknown): string | undefined {
    if (!Array.isArray(segs)) {
        return undefined;
    }

    return segs
        .map((seg: Json3Segment) => typeof seg?.utf8 === 'string' ? seg.utf8 : '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}

export function parseJson3Transcript(input: Json3TranscriptParserInput): Json3TranscriptParserResult {
    const checksum = sha256(input.rawJson3);

    let parsed: unknown;
    try {
        parsed = JSON.parse(input.rawJson3);
    } catch (error) {
        return {
            rawFormat: 'json3',
            checksum,
            segments: [],
            diagnostics: [
                {
                    code: 'INVALID_JSON',
                    message: error instanceof Error ? error.message : 'Invalid JSON.',
                },
            ],
        };
    }

    if (!isRecord(parsed) || !Array.isArray(parsed.events)) {
        return {
            rawFormat: 'json3',
            checksum,
            segments: [],
            diagnostics: [
                {
                    code: 'INVALID_ROOT',
                    message: 'Expected json3 root object with an events array.',
                },
            ],
        };
    }

    const diagnostics: Json3ParserDiagnostic[] = [];
    const segments: TranscriptSegment[] = [];

    parsed.events.forEach((event: unknown, eventIndex) => {
        if (!isRecord(event)) {
            diagnostics.push({
                code: 'UNSUPPORTED_EVENT',
                eventIndex,
                message: 'Expected json3 event to be an object.',
            });
            return;
        }

        const json3Event: Json3Event = event;
        if (!isFiniteNumber(json3Event.tStartMs) || !isFiniteNumber(json3Event.dDurationMs)) {
            diagnostics.push({
                code: 'MISSING_TIMING',
                eventIndex,
                message: 'Expected json3 event to include numeric tStartMs and dDurationMs.',
            });
            return;
        }

        const text = collapseTextRuns(json3Event.segs);
        if (text === undefined) {
            diagnostics.push({
                code: 'UNSUPPORTED_EVENT',
                eventIndex,
                message: 'Expected json3 event to include a segs array.',
            });
            return;
        }

        if (text.length === 0) {
            diagnostics.push({
                code: 'EMPTY_EVENT',
                eventIndex,
                message: 'Skipped json3 event with no caption text.',
            });
            return;
        }

        segments.push({
            idx: segments.length,
            startMs: json3Event.tStartMs,
            endMs: json3Event.tStartMs + json3Event.dDurationMs,
            text,
        });
    });

    return {
        rawFormat: 'json3',
        checksum,
        segments,
        diagnostics,
    };
}
