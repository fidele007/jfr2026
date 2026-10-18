export type PlaybackState = 'selected' | 'playing' | 'paused' | 'ended';

export const playbackLabels: Record<PlaybackState, string> = {
	selected: 'Vidéo sélectionnée',
	playing: 'En cours de lecture',
	paused: 'En pause',
	ended: 'Lecture terminée'
};

// YouTube state numbers are part of its public player event contract.
export function youtubePlaybackState(value: number): PlaybackState {
	if (value === 1) return 'playing';
	if (value === 2) return 'paused';
	if (value === 0) return 'ended';
	return 'selected';
}

export const PLAYLIST_PREVIEW_LIMIT = 5;

export function playlistNeedsExpansion<T>(items: T[], selected: T | undefined): boolean {
	return selected !== undefined && items.indexOf(selected) >= PLAYLIST_PREVIEW_LIMIT;
}

export function speakerSummary(speakers: { firstName?: string; lastName?: string }[] = []): string {
	const names = speakers
		.map((person) => `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim())
		.filter(Boolean);
	return (
		names.slice(0, 2).join(', ') +
		(names.length > 2 ? ` + ${names.length - 2} ${names.length === 3 ? 'autre' : 'autres'}` : '')
	);
}
