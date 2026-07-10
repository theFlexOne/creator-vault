import ingestChannelProfile from './ingestChannelProfile';
import ingestChannelVideos from './ingestChannelVideos';
import ingestTranscripts from './ingestTranscripts';
import profile from './profile';
import taxonomy from './taxonomy';
import testConnection from './testConnection';
import ui from './ui';

export const commands = [
    ingestChannelProfile,
    ingestChannelVideos,
    ingestTranscripts,
    profile,
    taxonomy,
    testConnection,
    ui,
]
