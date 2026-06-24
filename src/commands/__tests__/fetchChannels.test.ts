import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockRunFetchChannels = jest.fn() as jest.MockedFunction<(inputs: string[], save: boolean) => Promise<void>>;
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../services/fetchChannels.service', () => ({
	runFetchChannels: (...args: unknown[]) => (mockRunFetchChannels as any)(...args),
}));

jest.mock('../../shared/logger', () => ({
	logger: {
		info: (...args: unknown[]) => mockLoggerInfo(...args),
		error: (...args: unknown[]) => mockLoggerError(...args),
	},
}));

import fetchChannels from '../fetchChannels';

describe('fetchChannels command', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('delegates execution to the fetch channels service', async () => {
		await fetchChannels.handler({ inputs: ['channels.txt'], save: false, _: [], $0: '' } as any);

		expect(mockRunFetchChannels).toHaveBeenCalledWith(['channels.txt'], false);
	});
});
