import { describe, expect, it } from '@jest/globals';
import { createHash } from 'crypto';
import { parseJson3Transcript } from '../json3Parser';

function checksum(rawJson3: string): string {
    return `sha256:${createHash('sha256').update(rawJson3).digest('hex')}`;
}

describe('parseJson3Transcript', () => {
    it('parses normal json3 captions into normalized transcript segments', () => {
        const rawJson3 = JSON.stringify({
            events: [
                {
                    tStartMs: 1000,
                    dDurationMs: 2500,
                    segs: [{ utf8: 'The first caption.' }],
                },
                {
                    tStartMs: 3500,
                    dDurationMs: 1500,
                    segs: [{ utf8: 'The second caption.' }],
                },
            ],
        });

        expect(parseJson3Transcript({ rawJson3 })).toEqual({
            rawFormat: 'json3',
            checksum: checksum(rawJson3),
            segments: [
                {
                    idx: 0,
                    startMs: 1000,
                    endMs: 3500,
                    text: 'The first caption.',
                },
                {
                    idx: 1,
                    startMs: 3500,
                    endMs: 5000,
                    text: 'The second caption.',
                },
            ],
            diagnostics: [],
        });
    });

    it('collapses multi-run text and assigns stable emitted segment indexes', () => {
        const rawJson3 = JSON.stringify({
            events: [
                {
                    tStartMs: 0,
                    dDurationMs: 400,
                    segs: [{ utf8: '\n' }],
                },
                {
                    tStartMs: 400,
                    dDurationMs: 1100,
                    segs: [
                        { utf8: 'Grace' },
                        { utf8: ' ' },
                        { utf8: 'and' },
                        { utf8: '\n' },
                        { utf8: 'truth' },
                    ],
                },
            ],
        });

        expect(parseJson3Transcript({ rawJson3 })).toEqual({
            rawFormat: 'json3',
            checksum: checksum(rawJson3),
            segments: [
                {
                    idx: 0,
                    startMs: 400,
                    endMs: 1500,
                    text: 'Grace and truth',
                },
            ],
            diagnostics: [
                {
                    code: 'EMPTY_EVENT',
                    eventIndex: 0,
                    message: 'Skipped json3 event with no caption text.',
                },
            ],
        });
    });

    it('returns diagnostics for malformed individual events without throwing', () => {
        const rawJson3 = JSON.stringify({
            events: [
                {
                    tStartMs: 0,
                    dDurationMs: 1000,
                    segs: [{ utf8: 'Valid event' }],
                },
                {
                    dDurationMs: 1000,
                    segs: [{ utf8: 'No start time' }],
                },
                {
                    tStartMs: 2000,
                    dDurationMs: 1000,
                    unsupported: true,
                },
                'not an event',
            ],
        });

        expect(parseJson3Transcript({ rawJson3 })).toEqual({
            rawFormat: 'json3',
            checksum: checksum(rawJson3),
            segments: [
                {
                    idx: 0,
                    startMs: 0,
                    endMs: 1000,
                    text: 'Valid event',
                },
            ],
            diagnostics: [
                {
                    code: 'MISSING_TIMING',
                    eventIndex: 1,
                    message: 'Expected json3 event to include numeric tStartMs and dDurationMs.',
                },
                {
                    code: 'UNSUPPORTED_EVENT',
                    eventIndex: 2,
                    message: 'Expected json3 event to include a segs array.',
                },
                {
                    code: 'UNSUPPORTED_EVENT',
                    eventIndex: 3,
                    message: 'Expected json3 event to be an object.',
                },
            ],
        });
    });

    it('returns an invalid-json diagnostic for invalid top-level JSON', () => {
        const result = parseJson3Transcript({ rawJson3: '{"events":[' });

        expect(result.rawFormat).toBe('json3');
        expect(result.checksum).toBe(checksum('{"events":['));
        expect(result.segments).toEqual([]);
        expect(result.diagnostics).toHaveLength(1);
        expect(result.diagnostics[0]).toMatchObject({
            code: 'INVALID_JSON',
        });
    });

    it('returns an invalid-root diagnostic for unsupported root shapes', () => {
        const rawJson3 = JSON.stringify({ notEvents: [] });

        expect(parseJson3Transcript({ rawJson3 })).toEqual({
            rawFormat: 'json3',
            checksum: checksum(rawJson3),
            segments: [],
            diagnostics: [
                {
                    code: 'INVALID_ROOT',
                    message: 'Expected json3 root object with an events array.',
                },
            ],
        });
    });

    it('computes a stable SHA-256 checksum from the raw json3 payload', () => {
        const rawJson3 = '{"events":[]}';

        expect(parseJson3Transcript({ rawJson3 }).checksum).toBe(checksum(rawJson3));
        expect(parseJson3Transcript({ rawJson3 }).checksum).toBe(parseJson3Transcript({ rawJson3 }).checksum);
    });
});
