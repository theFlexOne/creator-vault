import normalizeYoutubeUrl from '../normalizeYoutubeUrl';

describe('normalizeYoutubeUrl', () => {
    it.each([
        [
            'channel ID',
            'UC1234567890',
            'https://www.youtube.com/channel/UC1234567890/videos',
        ],
        [
            'channel URL',
            'https://youtube.com/channel/UC1234567890',
            'https://youtube.com/channel/UC1234567890/videos',
        ],
        [
            'handle',
            '@example',
            'https://www.youtube.com/@example/videos',
        ],
        [
            'bare handle',
            'example',
            'https://www.youtube.com/@example/videos',
        ],
        [
            'channel URL with trailing slash',
            'https://www.youtube.com/@example/',
            'https://www.youtube.com/@example/videos',
        ],
    ])('normalizes a %s to the videos page', (_label, input, expected) => {
        expect(normalizeYoutubeUrl(input)).toBe(expected);
    });

    it('does not add /videos to watch URLs', () => {
        expect(normalizeYoutubeUrl('https://www.youtube.com/watch?v=abc123')).toBe(
            'https://www.youtube.com/watch?v=abc123',
        );
    });
});
