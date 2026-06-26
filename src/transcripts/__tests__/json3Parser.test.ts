import { describe, expect, it } from '@jest/globals';
import { parseJson3Transcript } from '../json3Parser';

describe('parseJson3Transcript', () => {
    it('returns stable placeholder output for raw json3 input', () => {
        expect(parseJson3Transcript({ rawJson3: '{"events":[]}', checksum: 'sha256:abc' })).toEqual({
            rawFormat: 'json3',
            checksum: 'sha256:abc',
            segments: [],
            diagnostics: [
                {
                    code: 'TODO_NOT_IMPLEMENTED',
                    message:
                        'TODO: traverse json3 events, collapse text runs, calculate start/end ms, filter empty events, and compute checksums.',
                },
            ],
        });
    });
});
