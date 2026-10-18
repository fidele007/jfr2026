<script lang="ts">
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import SessionMeta from '$lib/SessionMeta.svelte';
	import {
		PLAYLIST_PREVIEW_LIMIT,
		playlistNeedsExpansion,
		playbackLabels,
		youtubePlaybackState,
		type PlaybackState
	} from '$lib/media-ui';
	import { mediaHistory, prefs } from '../../stores';
	import { onDestroy, onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import MediaCard from '$lib/MediaCard.svelte';
	import MediaHistoryButton from '$lib/MediaHistoryButton.svelte';
	import Person from '$lib/Person.svelte';
	import Speakers from '$lib/Speakers.svelte';
	import Switch from '$lib/Switch.svelte';

	// Choose the player for each media item independently.
	let useYoutubePlayer = false;

	const MEDIA_HISTORY_LIMIT = 25;

	const searchParams = browser && $page.url.searchParams;
	let sessionId: string | null;
	let selectedMediaUrl: string | null;

	if (searchParams) {
		sessionId = searchParams.get('id');
		selectedMediaUrl = searchParams.get('media-url');
	}

	let loading = true;
	let loadError = false;
	let sessionDetail: any;
	let eventDetail: any;
	let objectives: string;
	let moderators: [any];
	let responsables: [any];

	let player: any;
	let videoElement: HTMLVideoElement;
	let currentMedia: any;
	let previousMedia: any;
	let autoplay: boolean = $prefs?.autoplay ?? false;
	let playbackState: PlaybackState = 'selected';
	let playlistExpanded = false;
	let compactPlaylist = false;
	let expansionMedia: any;
	$: if (currentMedia !== expansionMedia) {
		expansionMedia = currentMedia;
		if (playlistNeedsExpansion(mediaList, currentMedia)) playlistExpanded = true;
	}
	$: visibleMedia =
		compactPlaylist && !playlistExpanded ? mediaList.slice(0, PLAYLIST_PREVIEW_LIMIT) : mediaList;

	let mediaList: {
		youtubeId?: string;
		id: string | null;
		title: string;
		hdUrl: string;
		url: string;
		thumbnail: string;
		start: string;
		speakers: [any] | null;
	}[] = [];

	const getBestMediaSource = (media: any) => {
		if (screen.width <= 1024 && media.url) {
			return media.url;
		}

		return media.hdUrl;
	};

	const getYoutubeId = (videoMapping: { [key: string]: string }, originalUrl: string) => {
		const videoId = originalUrl?.split('/video/')[0].split('/').pop();
		return videoId ? videoMapping[videoId] || undefined : undefined;
	};

	const loadVideoMapping = async () => {
		try {
			const response = await fetch(`${base}/json/yt-video-mapping.json`);
			if (!response.ok) return {};
			return await response.json();
		} catch {
			return {};
		}
	};

	const createYoutubePlayer = () => {
		if (!useYoutubePlayer || !currentMedia || player) return;
		const videoId = currentMedia.youtubeId;
		player = new YT.Player('player', {
			videoId: videoId,
			playerVars: {
				modestbranding: 1,
				playsinline: 1,
				controls: 2,
				autoplay: autoplay ? 1 : 0,
				rel: 0 // Disable related videos at the end
			},
			events: {
				onStateChange: onPlayerStateChange,
				onError: () => {
					// Deleted, private, or embedding-disabled videos use the original sources.
					playbackState = 'selected';
					currentMedia.youtubeId = undefined;
					previousMedia = null;
					currentMedia = currentMedia;
				}
			}
		});
	};

	onMount(() => {
		const query = window.matchMedia('(max-width: 1000px)');
		const update = () => {
			compactPlaylist = query.matches;
		};
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});

	onMount(async () => {
		try {
			const response = await fetch(`${base}/json/${sessionId}.json`);
			sessionDetail = await response.json();
		} catch {
			loadError = true;
			loading = false;
			return;
		}
		eventDetail = sessionDetail.data.event;

		objectives = eventDetail.objectives
			.map((value: string) => `<div class="objectives-value">${value}</div>`)
			.join('');

		moderators = eventDetail.roles.find((role: any) => role.name === 'modérateur')?.assignees.items;
		responsables = eventDetail.roles.find((role: any) => role.name === 'responsable')?.assignees
			.items;

		const videoMapping = await loadVideoMapping();

		// Add publicly available media to the media list
		for (const item of eventDetail.schedule.items) {
			if (item.vod && item.vod.media && item.vod.media.element && item.vod.media.element.sources) {
				mediaList.push({
					id: item.vod.media.id,
					title: item.vod.media.id ? item.title : `${item.title} Ⓜ️`,
					hdUrl: item.vod.media.element.sources[0].uri,
					youtubeId: getYoutubeId(videoMapping, item.vod.media.element.sources[0].uri),
					url: item.vod.media.element.sources[1]?.uri,
					thumbnail: item.vod.media.thumbnail,
					start: item.start.split('T')[1].split('+')[0],
					speakers: item.speakers.items
				});
			}
		}

		if (
			eventDetail.vod &&
			eventDetail.vod.media &&
			eventDetail.vod.media.element &&
			eventDetail.vod.media.element.sources
		) {
			mediaList.push({
				id: eventDetail.vod.media.id,
				title: eventDetail.vod.media.title ?? '[Sans titre]',
				hdUrl: eventDetail.vod.media.element.sources[0].uri,
				youtubeId: getYoutubeId(videoMapping, eventDetail.vod.media.element.sources[0].uri),
				url: eventDetail.vod.media.element.sources[1]?.uri,
				thumbnail: eventDetail.vod.media.thumbnail,
				start: eventDetail.start.split('T')[1].split('+')[0],
				speakers: eventDetail.speakers.items
			});
		}

		mediaList = mediaList.toSorted((a: any, b: any) => a.start.localeCompare(b.start));

		if (mediaList.length > 0) {
			if (selectedMediaUrl) {
				currentMedia = mediaList.find(
					(item) =>
						item.hdUrl === selectedMediaUrl ||
						(item.youtubeId &&
							`https://www.youtube.com/embed/${item.youtubeId}` === selectedMediaUrl)
				);
			}

			if (!currentMedia) {
				currentMedia = mediaList[0];
			}
		}

		loading = false;
	});

	onDestroy(() => {
		if (player && player.destroy) {
			player.destroy();
		}
		if (browser) {
			delete window.onYouTubeIframeAPIReady;
		}
	});

	const onPlayerStateChange = (event: any) => {
		playbackState = youtubePlaybackState(event.data);
		if (event.data === YT.PlayerState.PLAYING) {
			onMediaPlay(currentMedia);
		} else if (event.data === YT.PlayerState.ENDED) {
			onMediaEnded(currentMedia);
		}
	};

	const playMedia = async (media: any) => {
		if (!media || media === previousMedia) {
			return;
		}
		playbackState = 'selected';
		const shouldPlay = Boolean(previousMedia) || autoplay;
		previousMedia = media;

		const wasYoutube = useYoutubePlayer;
		useYoutubePlayer = Boolean(media.youtubeId);
		if (wasYoutube && !useYoutubePlayer && player) {
			player.destroy();
			player = undefined;
		}
		await tick();
		if (media !== currentMedia) return;

		if (useYoutubePlayer) {
			if (player) {
				player.loadVideoById(media.youtubeId);
			} else if (window.YT?.Player) {
				createYoutubePlayer();
			} else {
				window.onYouTubeIframeAPIReady = createYoutubePlayer;
				if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
					const tag = document.createElement('script');
					tag.src = 'https://www.youtube.com/iframe_api';
					document.body.appendChild(tag);
				}
			}
		} else if (videoElement && shouldPlay) {
			videoElement.addEventListener('loadeddata', () => videoElement.play().catch(() => {}), {
				once: true
			});
		}

		if (window.matchMedia('(max-width: 1000px)').matches) {
			document.getElementById('video-container')?.scrollIntoView({
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
					? 'instant'
					: 'smooth',
				block: 'start'
			});
		}
	};

	const onMediaPlay = (media: any) => {
		playbackState = 'playing';
		const filteredArray = $mediaHistory.filter((item: any) => item.hdUrl !== media.hdUrl);

		const historyMedia = structuredClone(media);
		historyMedia['sessionId'] = sessionId;
		historyMedia['sessionTitle'] = eventDetail.title;
		historyMedia['sessionTypeColor'] =
			eventDetail.sessionTypeColor !== '#000000' ? eventDetail.sessionTypeColor : '#dfdfdf';

		$mediaHistory = [historyMedia, ...filteredArray].slice(0, MEDIA_HISTORY_LIMIT);
	};

	const onMediaEnded = (media: any) => {
		playbackState = 'ended';
		if (!$prefs.autoplay) {
			return;
		}

		const mediaIndex = mediaList.indexOf(media);
		if (mediaIndex < mediaList.length - 1) {
			currentMedia = mediaList[mediaIndex + 1];
		}
	};

	$: if ($prefs) $prefs = { autoplay: autoplay };
	$: (currentMedia, playMedia(currentMedia));
	$: typeColor =
		eventDetail && eventDetail.sessionTypeColor !== '#000000'
			? eventDetail.sessionTypeColor
			: 'var(--text-muted)';
</script>

<svelte:head>
	<title>{eventDetail ? `${eventDetail.title} — JFR 2026` : 'JFR 2026'}</title>
</svelte:head>

<header class="topbar sticky-top">
	<div class="topbar-inner">
		<a href="{base}/" class="btn back-link">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M15 6L9 12L15 18"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span>Sessions</span>
		</a>
		{#if eventDetail}
			<div class="topbar-title" title={eventDetail.title}>{eventDetail.title}</div>
		{/if}
		<MediaHistoryButton />
	</div>
</header>

<main style="--type-color: {typeColor}">
	{#if loading}
		<div class="DNA_cont" aria-label="Chargement" role="status">
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
			<div class="nucleobase"></div>
		</div>
	{/if}

	{#if loadError}
		<div class="error-state">
			<p><strong>Session introuvable</strong></p>
			<p>Le lien est peut-être incorrect ou la session n'existe plus.</p>
			<a href="{base}/" class="btn">Retour aux sessions</a>
		</div>
	{/if}

	{#if !loading && eventDetail}
		<div class="layout" class:no-media={mediaList.length == 0}>
			{#if mediaList.length > 0}
				<section class="player-area" aria-label="Lecteur vidéo">
					<div id="video-container">
						{#if useYoutubePlayer}
							<div id="player"></div>
						{:else}
							<video
								bind:this={videoElement}
								{autoplay}
								controls
								playsinline
								preload="metadata"
								class="video-player"
								src={getBestMediaSource(currentMedia)}
								poster={currentMedia.thumbnail}
								on:playing={() => onMediaPlay(currentMedia)}
								on:pause={() => {
									if (playbackState !== 'ended') playbackState = 'paused';
								}}
								on:emptied={() => (playbackState = 'selected')}
								on:error={() => (playbackState = 'selected')}
								on:ended={() => onMediaEnded(currentMedia)}
							>
								<track kind="captions" />
							</video>
						{/if}
					</div>
					<div id="current-media-info">
						<div class="now-playing" role="status">{playbackLabels[playbackState]}</div>
						<h2>{currentMedia.title ?? '😶‍🌫️'}</h2>
						{#if currentMedia.speakers}
							<Speakers speakers={currentMedia.speakers} />
						{/if}
					</div>
				</section>

				<aside class="playlist-container" aria-label="Liste de lecture">
					<div id="playlist-title">
						<strong>Liste de lecture <span class="count">{mediaList.length}</span></strong>
						<Switch bind:checked={autoplay} />
					</div>
					<div class="playlist" id="session-playlist">
						{#each visibleMedia as item}
							<MediaCard media={item} downloadable={true} bind:currentMedia {playbackState} />
						{/each}
					</div>
					{#if compactPlaylist && mediaList.length > PLAYLIST_PREVIEW_LIMIT}
						<button
							type="button"
							class="btn playlist-toggle"
							aria-expanded={playlistExpanded}
							aria-controls="session-playlist"
							on:click={() => (playlistExpanded = !playlistExpanded)}
						>
							{playlistExpanded ? 'Réduire la liste' : `Afficher les ${mediaList.length} vidéos`}
						</button>
					{/if}
				</aside>
			{/if}

			<article class="detail">
				<div class="session-header">
					<div class="session-type">{eventDetail.sessionType}</div>
					<h1>{eventDetail.title}</h1>
					<SessionMeta start={eventDetail.start} end={eventDetail.end} />
				</div>
				{#if mediaList.length == 0}
					<p class="no-media-note">Aucune vidéo n'est disponible pour cette session.</p>
				{/if}
				{#if objectives}
					<div class="objectives">
						<h3>Objectifs</h3>
						<div>
							{@html objectives}
						</div>
					</div>
				{/if}
				{#if moderators?.length || responsables?.length || eventDetail.speakers?.items?.length || eventDetail.organizers?.length}
					<dl class="person-list">
						{#if eventDetail.speakers?.items?.length}
							<div>
								<dt>Orateurs</dt>
								<dd><Speakers speakers={eventDetail.speakers.items} /></dd>
							</div>
						{/if}
						{#if eventDetail.organizers?.length}
							<div>
								<dt>Organisateur</dt>
								<dd>{eventDetail.organizers.map((item: any) => item.name).join(', ')}</dd>
							</div>
						{/if}
						{#if moderators?.length}
							<div>
								<dt>Modérateur</dt>
								<dd>
									{#each moderators as person}
										<Person info={person} />
									{/each}
								</dd>
							</div>
						{/if}
						{#if responsables?.length}
							<div>
								<dt>Responsable</dt>
								<dd>
									{#each responsables as person}
										<Person info={person} />
									{/each}
								</dd>
							</div>
						{/if}
					</dl>
				{/if}
			</article>
		</div>
	{/if}
</main>

<style>
	.topbar {
		border-bottom: 1px solid var(--border);
	}

	.topbar-inner {
		display: flex;
		align-items: center;
		gap: 12px;
		max-width: 1440px;
		margin: 0 auto;
		padding: 10px 16px;
	}

	.back-link {
		padding-left: 8px;
	}

	.topbar-title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-weight: 600;
		color: var(--text-muted);
	}

	main {
		max-width: 1440px;
		margin: 0 auto;
		padding: 16px;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(360px, 34%);
		grid-template-areas:
			'player playlist'
			'detail playlist';
		grid-template-rows: auto 1fr;
		gap: 16px;
		align-items: start;
	}

	.layout.no-media {
		grid-template-columns: minmax(0, 860px);
		grid-template-areas: 'detail';
		justify-content: center;
	}

	.player-area {
		grid-area: player;
		border-radius: var(--radius);
		overflow: hidden;
		background-color: var(--surface);
		border: 1px solid var(--border);
	}

	#video-container {
		display: flex;
		aspect-ratio: 16 / 9;
		background-color: #000;
		scroll-margin-top: 70px;
	}

	#video-container > video {
		width: 100%;
		height: 100%;
	}

	#player {
		width: 100%;
		height: 100%;
	}

	#current-media-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 16px 14px;
	}

	.now-playing {
		color: var(--text-muted);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	#current-media-info h2 {
		margin: 0;
		font-size: 1.1rem;
		line-height: 1.3;
	}

	.playlist-container {
		grid-area: playlist;
		position: sticky;
		top: 76px;
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 92px);
		border-radius: var(--radius);
		overflow: hidden;
		background-color: var(--surface);
		border: 1px solid var(--border);
	}

	#playlist-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-bottom: 1px solid var(--border);
	}

	.count {
		display: inline-block;
		min-width: 22px;
		margin-left: 4px;
		padding: 0 7px;
		border-radius: 50px;
		background-color: var(--surface-hover);
		color: var(--text-muted);
		font-size: 0.8rem;
		text-align: center;
	}

	.playlist-toggle {
		margin: 8px 12px 12px;
	}

	.playlist {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.detail {
		grid-area: detail;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 18px 20px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		border-left: 5px solid var(--type-color);
		background-color: var(--surface);
	}

	.session-type {
		color: var(--link);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.session-header {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.no-media-note {
		margin: 0;
		padding: 10px 14px;
		border-radius: var(--radius-sm);
		background-color: var(--surface-hover);
		color: var(--text-muted);
	}

	.objectives {
		padding: 14px 16px;
		border-radius: var(--radius-sm);
		background-color: var(--surface-sunken);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.objectives h3 {
		margin: 0;
		font-size: 0.8rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	:global(.objectives-value) {
		margin-top: 8px;
	}

	:global(.objectives p) {
		margin: 0;
	}

	.person-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 0;
	}

	.person-list > div {
		display: flex;
		gap: 12px;
	}

	.person-list dt {
		flex: 0 0 100px;
		padding-top: 8px;
		color: var(--text-muted);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.person-list dd {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 20px;
		margin: 0;
	}

	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 64px 16px;
		text-align: center;
		color: var(--text-muted);
	}

	.error-state p {
		margin: 0;
	}

	.error-state strong {
		color: var(--text);
		font-size: 1.15rem;
	}

	.error-state .btn {
		margin-top: 16px;
	}

	@media (max-width: 1000px) {
		main {
			padding: 0 0 32px;
		}

		.topbar-inner {
			padding: 8px 12px;
		}

		.layout {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas:
				'player'
				'playlist'
				'detail';
			grid-template-rows: auto;
			gap: 12px;
		}

		.layout.no-media {
			padding: 12px;
		}

		.player-area {
			border-radius: 0;
			border-left: none;
			border-right: none;
			border-top: none;
		}

		#video-container {
			scroll-margin-top: 58px;
		}

		.playlist-container {
			position: static;
			max-height: none;
			overflow: visible;
			margin: 0 12px;
		}

		.playlist {
			overflow: visible;
			overscroll-behavior: auto;
		}

		.detail {
			margin: 0 12px;
			padding: 14px 16px;
		}

		h1 {
			font-size: 1.25rem;
		}

		.person-list > div {
			flex-direction: column;
			gap: 4px;
		}

		.person-list dt {
			flex-basis: auto;
			padding-top: 0;
		}
	}

	@media (max-width: 600px) {
		.topbar-title {
			display: none;
		}

		.topbar-inner {
			justify-content: space-between;
		}
	}
</style>
