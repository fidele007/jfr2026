import { expect, test } from 'bun:test';
import { playlistNeedsExpansion, speakerSummary, youtubePlaybackState } from '../src/lib/media-ui';

test('deep links and autoplay reveal selections beyond the five-video preview', () => {
	const items = Array.from({ length: 15 }, (_, id) => ({ id }));
	expect(playlistNeedsExpansion(items, items[0])).toBe(false);
	expect(playlistNeedsExpansion(items, items[4])).toBe(false);
	expect(playlistNeedsExpansion(items, items[5])).toBe(true);
	expect(playlistNeedsExpansion(items, items[14])).toBe(true);
	expect(playlistNeedsExpansion(items, undefined)).toBe(false);
	expect(playlistNeedsExpansion([], items[0])).toBe(false);
});

test('player labels distinguish actual playback from selection and blocked autoplay', () => {
	expect(youtubePlaybackState(-1)).toBe('selected');
	expect(youtubePlaybackState(5)).toBe('selected');
	expect(youtubePlaybackState(1)).toBe('playing');
	expect(youtubePlaybackState(2)).toBe('paused');
	expect(youtubePlaybackState(0)).toBe('ended');
	expect(youtubePlaybackState(3)).not.toBe('playing');
});

test('speaker summaries preserve short lists and count additional people', () => {
	expect(speakerSummary()).toBe('');
	expect(speakerSummary([{ firstName: 'Marc', lastName: 'Tassart' }])).toBe('Marc Tassart');
	expect(
		speakerSummary([{ firstName: 'Marc' }, { firstName: 'Alexandre' }, { firstName: 'Florian' }])
	).toBe('Marc, Alexandre + 1 autre');
});
