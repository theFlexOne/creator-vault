export type Json3TranscriptParserInput = {
    rawJson3: string;
    checksum?: string;
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
    code: 'TODO_NOT_IMPLEMENTED';
    message: string;
};

export type Json3TranscriptParserResult = {
    rawFormat: 'json3';
    checksum?: string;
    segments: TranscriptSegment[];
    diagnostics: Json3ParserDiagnostic[];
};

export function parseJson3Transcript(input: Json3TranscriptParserInput): Json3TranscriptParserResult {
    return {
        rawFormat: 'json3',
        checksum: input.checksum,
        segments: [],
        diagnostics: [
            {
                code: 'TODO_NOT_IMPLEMENTED',
                message:
                    'TODO: traverse json3 events, collapse text runs, calculate start/end ms, filter empty events, and compute checksums.',
            },
        ],
    };
}
