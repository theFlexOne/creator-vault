import ingestChannelProfile from './ingestChannelProfile';
import ingestChannelVideos from './ingestChannelVideos';
import ingestTranscripts from './ingestTranscripts';
import testConnection from './testConnection';
import ui from './ui';

export const commands = [
    ingestChannelProfile,
    ingestChannelVideos,
    ingestTranscripts,
    testConnection,
    ui,
]
