/**
 * Normalizes a string (URL, handle, or ID) into a full YouTube URL pointing to the videos tab.
 */
export default function normalizeYoutubeUrl(input: string): string {
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