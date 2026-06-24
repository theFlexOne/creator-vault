import { CommandModule } from 'yargs';
import { runTestConnection } from '../services/testConnection.service';

const testConnection: CommandModule = {
    command: 'test-connection',
    describe: 'Verify database and YouTube downloader configuration',
    handler: async () => {
        await runTestConnection();
    },
};

export default testConnection;
