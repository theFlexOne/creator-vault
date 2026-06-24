export default async function getChannelTranscripts(videoIds: number[]): Promise<{ videoId: number; text: string }[]> {
    return videoIds.map((videoId) => ({ videoId, text: '' }));
}
