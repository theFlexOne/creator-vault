import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockResolveIdentifiers = jest.fn() as jest.MockedFunction<(args: string[]) => Promise<string[]>>;
const mockGetChannelInfo = jest.fn() as jest.MockedFunction<(input: string) => Promise<unknown>>;
const mockUpsertChannelData = jest.fn() as jest.MockedFunction<(data: unknown) => unknown>;
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../services/command.service', () => ({
	resolveIdentifiers: (...args: unknown[]) => (mockResolveIdentifiers as any)(...args),
}));

jest.mock('../../lib/yt-dlp/getChannelInfo', () => ({
	__esModule: true,
	default: (...args: unknown[]) => (mockGetChannelInfo as any)(...args),
}));

jest.mock('../../services/db.service', () => ({
	upsertChannelData: (...args: unknown[]) => (mockUpsertChannelData as any)(...args),
}));

jest.mock('../../logger', () => ({
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

	it('fetches each resolved channel and skips persistence when save is false', async () => {
		mockResolveIdentifiers.mockResolvedValue(['@alpha', '@beta']);
		mockGetChannelInfo
			.mockResolvedValueOnce({ handle: '@alpha', name: 'Alpha' })
			.mockResolvedValueOnce({ handle: '@beta', name: 'Beta' });

		await fetchChannels.handler({ inputs: ['channels.txt'], save: false, _: [], $0: '' } as any);

		expect(mockResolveIdentifiers).toHaveBeenCalledWith(['channels.txt']);
		expect(mockGetChannelInfo).toHaveBeenNthCalledWith(1, '@alpha');
		expect(mockGetChannelInfo).toHaveBeenNthCalledWith(2, '@beta');
		expect(mockUpsertChannelData).not.toHaveBeenCalled();
		expect(mockLoggerInfo).toHaveBeenCalledWith('Channel not saved (use --save to store in DB).');
		expect(mockLoggerError).not.toHaveBeenCalled();
	});

	it('persists each fetched channel when save is true', async () => {
		mockResolveIdentifiers.mockResolvedValue(['@saved']);
		mockGetChannelInfo.mockResolvedValue({
			handle: '@saved',
			youtubeChannelId: 'UC999',
			name: 'Saved Channel',
			url: 'https://www.youtube.com/@saved',
		});

		await fetchChannels.handler({ inputs: ['@saved'], save: true, _: [], $0: '' } as any);

		expect(mockGetChannelInfo).toHaveBeenCalledWith('@saved');
		expect(mockUpsertChannelData).toHaveBeenCalledWith({
			handle: '@saved',
			youtubeChannelId: 'UC999',
			name: 'Saved Channel',
			url: 'https://www.youtube.com/@saved',
		});
		expect(mockLoggerInfo).not.toHaveBeenCalledWith('Channel not saved (use --save to store in DB).');
	});

	it('continues after a failed channel fetch', async () => {
		const fetchError = new Error('fetch failed');

		mockResolveIdentifiers.mockResolvedValue(['@broken', '@working']);
		mockGetChannelInfo
			.mockRejectedValueOnce(fetchError)
			.mockResolvedValueOnce({ handle: '@working', name: 'Working' });

		await fetchChannels.handler({ inputs: ['@broken', '@working'], save: false, _: [], $0: '' } as any);

		expect(mockLoggerError).toHaveBeenCalledWith('Error during fetchChannel for @broken:', fetchError);
		expect(mockGetChannelInfo).toHaveBeenNthCalledWith(2, '@working');
	});
});
