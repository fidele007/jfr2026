<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { base } from '$app/paths';
	import { IconClock, IconDownload, IconPlayerPlayFilled } from '@tabler/icons-svelte';
	import { sanitizeFilename } from './Constants.svelte';
	import { speakerSummary, type PlaybackState } from './media-ui';

	const dispatch = createEventDispatcher();
	export let media: any;
	export let currentMedia: any = null;
	export let downloadable = false;
	export let showTime = true;
	export let playbackState: PlaybackState | undefined = undefined;
	$: selected = media === currentMedia;
	$: speakers = media.speakers ?? [];
	let failedImage: string | undefined;

	const select = () => {
		currentMedia = media;
		dispatch('onClickMedia', media);
	};
	const download = () => {
		const url = media.hdUrl ?? media.url;
		const extension = url.split('?')[0].split('.').pop();
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = sanitizeFilename(media.title) + '.' + extension;
		anchor.target = '_blank';
		anchor.rel = 'noopener';
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
	};
</script>

<div class="media-item" class:selected>
	<button
		type="button"
		class="media-select"
		aria-label={media.title}
		aria-current={selected ? 'true' : undefined}
		on:click={select}
	></button>
	{#if media.thumbnail && failedImage !== media.thumbnail}
		<div class="thumbnail-container">
			<img
				class="thumbnail"
				src={media.thumbnail}
				alt=""
				loading="lazy"
				decoding="async"
				on:error={() => (failedImage = media.thumbnail)}
			/>
			<span class="play-icon"><IconPlayerPlayFilled size={14} aria-hidden="true" /></span>
			{#if selected && playbackState === 'playing'}<span class="playing-badge">Lecture</span>{/if}
		</div>
	{/if}
	<div class="video-details">
		{#if media.sessionTitle}<span class="media-session-title">{media.sessionTitle}</span>{/if}
		<strong class="media-title">{media.title}</strong>
		{#if showTime || downloadable}
			<div class="media-meta">
				{#if showTime}<span class="media-time"
						><IconClock size={15} aria-hidden="true" />{media.start?.slice(0, 5)}</span
					>{/if}
				{#if downloadable}
					<button
						type="button"
						class="btn-download"
						title="Télécharger la vidéo"
						aria-label={`Télécharger : ${media.title}`}
						on:click={download}
					>
						<IconDownload size={16} aria-hidden="true" />
						<span>Télécharger</span>
					</button>
				{/if}
			</div>
		{/if}
		{#if speakers.length}
			<span class="speaker-list">
				{#each speakers.slice(0, 2) as speaker}
					<span class="speaker-person">
						<img
							class="speaker-avatar"
							src={speaker.photo?.url || `${base}/avatar_placeholder.png`}
							alt=""
							width="24"
							height="24"
							loading="lazy"
							decoding="async"
							on:error={(event) => {
								const fallback = new URL(`${base}/avatar_placeholder.png`, window.location.href)
									.href;
								const image = event.currentTarget as HTMLImageElement;
								if (image.src !== fallback) image.src = fallback;
							}}
						/>
						<span>{speakerSummary([speaker])}</span>
					</span>
				{/each}
				{#if speakers.length > 2}
					<span class="more-speakers"
						>+ {speakers.length - 2} {speakers.length === 3 ? 'autre' : 'autres'}</span
					>
				{/if}
			</span>
		{/if}
	</div>
</div>

<style>
	.media-item {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 10px;
		border-left: 3px solid transparent;
		border-radius: var(--radius-sm);
		padding: 8px 6px;
	}
	.media-item.selected {
		background: var(--surface-hover);
		border-left-color: var(--highlight);
	}
	.media-item:has(.media-select:hover) {
		background: var(--surface-hover);
	}
	.media-select {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		border-radius: inherit;
		background: transparent;
		cursor: pointer;
	}
	.media-select:focus-visible {
		outline-offset: -2px;
	}
	.thumbnail-container {
		position: relative;
		align-self: center;
		flex: 0 0 144px;
		aspect-ratio: 16 / 9;
		border-radius: 4px;
		overflow: hidden;
		background: var(--surface-sunken);
	}
	.thumbnail {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.play-icon {
		position: absolute;
		bottom: 3px;
		right: 3px;
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgb(0 0 0 / 65%);
		color: white;
	}
	.playing-badge {
		position: absolute;
		left: 3px;
		bottom: 3px;
		padding: 1px 5px;
		background: var(--highlight);
		color: var(--on-highlight);
		border-radius: 3px;
		font-size: 0.7rem;
		font-weight: 600;
	}
	.video-details {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
		flex: 1;
	}
	.media-title {
		font-size: 0.9rem;
		line-height: 1.3;
		overflow-wrap: anywhere;
	}
	.media-session-title {
		font-size: 0.75rem;
		color: var(--text-muted);
	}
	.media-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		min-height: 24px;
	}
	.media-time {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--text-muted);
		font-size: 0.8rem;
	}
	.btn-download {
		position: relative;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		flex: 0 0 auto;
		height: 24px;
		padding: 4px;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-muted);
		font-size: 0.8rem;
		cursor: pointer;
	}
	.btn-download:hover {
		color: var(--text);
		background: var(--surface-sunken);
	}
	.speaker-list {
		display: flex;
		flex-direction: column;
		gap: 3px;
		color: var(--text-muted);
		font-size: 0.8rem;
		line-height: 1.35;
	}
	.speaker-person {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.speaker-avatar {
		flex: 0 0 24px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
	}
	.more-speakers {
		padding-left: 30px;
	}
	@media (max-width: 1000px) {
		.thumbnail-container {
			flex-basis: 112px;
		}
	}
	@media (max-width: 400px) {
		.thumbnail-container {
			flex-basis: 100px;
		}
	}
</style>
