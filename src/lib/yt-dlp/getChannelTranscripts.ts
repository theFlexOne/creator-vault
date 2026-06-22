import getVideoTranscript from './getVideoTranscript';

export interface VideoTranscript {
    videoId: string;
    transcript: string;
}

export default async function getChannelTranscripts(videoIds: string[]): Promise<VideoTranscript[]> {
    const results: VideoTranscript[] = [];
    
    for (const videoId of videoIds) {
        const transcript = await getVideoTranscript(videoId);
        if (transcript) {
            results.push({ videoId, transcript });
        }
        // Add a small delay between requests to be nicer to YouTube
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
}

