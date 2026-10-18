<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { base } from '$app/paths';
	import { IconDownload, IconPlayerPlayFilled } from '@tabler/icons-svelte';
	import { sanitizeFilename } from './Constants.svelte';
	import SessionMeta from './SessionMeta.svelte';
	import { playbackLabels, speakerSummary, type PlaybackState } from './media-ui';

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
	>
		{#if media.thumbnail && failedImage !== media.thumbnail}
			<span class="thumbnail-container">
				<img
					class="thumbnail"
					src={media.thumbnail}
					alt=""
					loading="lazy"
					decoding="async"
					on:error={() => (failedImage = media.thumbnail)}
				/>
				<span class="play-icon"><IconPlayerPlayFilled size={14} aria-hidden="true" /></span>
			</span>
		{/if}
		<span class="video-details">
			{#if media.sessionTitle}<span class="media-session-title">{media.sessionTitle}</span>{/if}
			<strong class="media-title">{media.title}</strong>
			{#if selected && playbackState}<span class="playing-badge"
					>{playbackLabels[playbackState]}</span
				>{/if}
			{#if showTime}<SessionMeta start={media.start} />{/if}
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
		</span>
	</button>
	{#if downloadable}
		<button
			type="button"
			class="btn-download"
			title="Télécharger la vidéo"
			aria-label={`Télécharger : ${media.title}`}
			on:click={download}
		>
			<IconDownload size={17} aria-hidden="true" />
		</button>
	{/if}
</div>

<style>
	.media-item {
		position: relative;
		border-left: 3px solid transparent;
		border-radius: var(--radius-sm);
		padding: 4px;
	}
	.media-item.selected {
		background: var(--surface-hover);
		border-left-color: var(--highlight);
	}
	.media-select {
		display: flex;
		width: 100%;
		gap: 12px;
		padding: 8px;
		min-height: 44px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--text);
		text-align: left;
		cursor: pointer;
	}
	.media-select:hover {
		background: var(--surface-hover);
	}
	.thumbnail-container {
		position: relative;
		flex: 0 0 112px;
		align-self: flex-start;
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
	.video-details {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-width: 0;
		flex: 1;
	}
	.media-title {
		font-size: 0.95rem;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	.media-session-title {
		font-size: 0.75rem;
		color: var(--text-muted);
	}
	.playing-badge {
		color: var(--text);
		font-weight: 600;
		font-size: 0.75rem;
	}
	.speaker-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		color: var(--text-muted);
		font-size: 0.85rem;
		line-height: 1.4;
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

	.btn-download {
		position: absolute;
		left: 12px;
		bottom: 8px;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-muted);
		font-size: 0.85rem;
		cursor: pointer;
	}
	.media-item:has(.btn-download) .media-select {
		min-height: 128px;
	}
	.media-item:has(.btn-download):not(:has(.thumbnail-container)) .media-select {
		padding-bottom: 48px;
	}
	.btn-download:hover {
		color: var(--text);
		background: var(--surface-hover);
	}
	@media (max-width: 720px) {
		.thumbnail-container {
			flex-basis: 112px;
		}
		.media-select {
			gap: 10px;
		}
	}
</style>
