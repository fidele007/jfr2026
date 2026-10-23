<script lang="ts">
	import { base } from '$app/paths';
	import { filterOptions } from '../stores';
	import { IconChevronDown, IconSearch, IconX } from '@tabler/icons-svelte';
	import { getFriendlyDate, normalizeString } from '$lib/Constants.svelte';
	import { onDestroy, onMount } from 'svelte';
	import BackToTop from '$lib/BackToTop.svelte';
	import MediaHistoryButton from '$lib/MediaHistoryButton.svelte';
	import SessionCard from '$lib/SessionCard.svelte';
	import { rankSessions } from '$lib/semantic';
	import { fetchSearchScores } from '$lib/search-client';

	const searchEndpoint = import.meta.env.VITE_SEARCH_API_URL?.trim() || '';
	let semanticStatus = '';
	let semanticMatches = new Map<string, number>();
	let semanticPending = false;
	let semanticRequest: AbortController | undefined;
	let catalogueHash = '';
	let searchVersion = 0;
	const applySemanticSearch = async (value: string, id: number) => {
		if (!searchEndpoint || !catalogueHash) return;
		semanticRequest?.abort();
		const request = new AbortController();
		semanticRequest = request;
		const deadline = setTimeout(() => request.abort(), 8000);
		semanticPending = true;
		semanticStatus = 'Recherche par sens…';
		try {
			const scores = await fetchSearchScores(searchEndpoint, value, catalogueHash, request.signal);
			if (id !== searchVersion) return;
			const scoped = sessionsByDate[selectedDate] ?? sessionsByDate[''];
			semanticMatches = new Map<string, number>(
				scores.filter(([id]: [string, number]) => {
					const session = scoped.find((item: any) => item.id === id);
					return session && !eventContainString(session, value);
				})
			);
			filteredSessions = rankSessions(
				scoped.filter((x: any) => !onlyVideos || x.picture),
				new Map(scores),
				(x: any) => eventContainString(x, value)
			);
			if (sortAlphabetically)
				filteredSessions = filteredSessions.toSorted((a: any, b: any) =>
					a.title.localeCompare(b.title)
				);
			displaySessions = filteredSessions.slice(0, FETCH_LIMIT);
			semanticStatus = 'Mots-clés et sujets proches';
		} catch {
			if (id === searchVersion) semanticStatus = 'Mots-clés uniquement';
		} finally {
			clearTimeout(deadline);
			if (id === searchVersion) semanticPending = false;
			if (semanticRequest === request) semanticRequest = undefined;
		}
	};

	let searchInput: HTMLInputElement;

	const logoUrl = `${base}/jfr_2026.png`;

	const FETCH_LIMIT = 25;

	let loading = true;
	let timeout: ReturnType<typeof setTimeout>;

	let showClearSearch: boolean;
	let sortAlphabetically: boolean;
	let onlyVideos: boolean;
	let selectedDate: string = '';

	let eventJson: any;
	let sessionsByDate: any = {};
	let filteredSessions: any;
	let displaySessions: any;

	const debounce = (callback: Function, wait = 300) => {
		return (...args: any[]) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => callback(...args), wait);
		};
	};

	const extractTextFromHTML = (htmlString: string) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlString, 'text/html');
		return doc.body.textContent || '';
	};

	const eventContainString = (event: any, value: string) => {
		const normalizedSearchTerm = normalizeString(value).toUpperCase();
		return (
			event.normalizedTitle.includes(normalizedSearchTerm) ||
			event.normalizedObjective.includes(normalizedSearchTerm) ||
			event.normalizedOrganizers.includes(normalizedSearchTerm) ||
			event.normalizedMembers.includes(normalizedSearchTerm)
		);
	};

	const searchSessions = async (value: string) => {
		const version = ++searchVersion;
		semanticRequest?.abort();
		value = value.trim();
		semanticStatus = '';
		semanticMatches = new Map();
		semanticPending = false;
		loading = true;

		const scopedSessions = sessionsByDate[selectedDate] ?? sessionsByDate[''];
		if (onlyVideos) {
			filteredSessions = value
				? scopedSessions.filter((x: any) => x.picture && eventContainString(x, value))
				: scopedSessions.filter((x: any) => x.picture);
		} else {
			filteredSessions = value
				? scopedSessions.filter((x: any) => eventContainString(x, value))
				: scopedSessions;
		}

		if (sortAlphabetically) {
			filteredSessions = filteredSessions.toSorted((a: any, b: any) =>
				a.title.localeCompare(b.title)
			);
		}

		displaySessions = filteredSessions.slice(0, FETCH_LIMIT);

		loading = false;
		if (value) void applySemanticSearch(value, version);

		$filterOptions = {
			filterKeyword: searchInput.value,
			sortAlphabetically: sortAlphabetically,
			onlyVideos: onlyVideos,
			selectedDate: selectedDate
		};
	};

	const onSearch = async () => {
		searchVersion++;
		semanticRequest?.abort();
		semanticStatus = '';
		semanticMatches = new Map();
		semanticPending = false;
		showClearSearch = searchInput.value?.length > 0;
		loading = true;
		debounce(searchSessions).call(null, searchInput.value);
	};

	const resetFilters = () => {
		clearTimeout(timeout);
		selectedDate = '';
		onlyVideos = false;
		sortAlphabetically = false;
		searchSessions(searchInput.value);
	};

	const onFilterChange = () => {
		clearTimeout(timeout);
		searchSessions(searchInput.value);
	};

	const onDeleteSearch = () => {
		if (searchInput.value) {
			searchInput.value = '';
			clearTimeout(timeout);
			showClearSearch = false;
			searchSessions('');
		}
		searchInput.focus();
	};

	// e.g. "Jeu. 08" — the month is rendered separately so it can be hidden on small screens
	const dayLabel = (date: Date) => {
		const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
		return label.charAt(0).toUpperCase() + label.slice(1);
	};

	const onDateChange = async (date: string) => {
		clearTimeout(timeout);
		selectedDate = date;
		await searchSessions(searchInput.value);
	};

	const loadMore = () => {
		if (filteredSessions) {
			for (let index = 0; index < FETCH_LIMIT; index++) {
				if (filteredSessions.length == displaySessions.length) {
					break;
				}

				displaySessions = [...displaySessions, filteredSessions[displaySessions.length]];
			}
		}
	};

	const onScroll = () => {
		const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

		// Trigger a bit before the very bottom: mobile browsers report fractional scroll values
		if (window.scrollY >= scrollableHeight - 400) {
			loadMore();
		}
	};

	onMount(async () => {
		searchInput.value = $filterOptions.filterKeyword;
		showClearSearch = searchInput.value?.length > 0;
		sortAlphabetically = $filterOptions.sortAlphabetically;
		onlyVideos = $filterOptions.onlyVideos;
		selectedDate = $filterOptions.selectedDate;

		const response = await fetch(`${base}/json/event.json`);
		const bytes = await response.arrayBuffer();
		eventJson = JSON.parse(new TextDecoder().decode(bytes));
		if (searchEndpoint && globalThis.crypto?.subtle) {
			const digest = await crypto.subtle.digest('SHA-256', bytes);
			catalogueHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
		}

		const allRealItems = eventJson.data.event.search.items.filter(
			(x: any) => !x.title.startsWith('Session test')
		);

		sessionsByDate[''] = allRealItems;
		allRealItems.forEach((item: any) => {
			const startDate = item.start.split('T')[0];
			if (!sessionsByDate[startDate]) {
				sessionsByDate[startDate] = [];
			}

			item['normalizedTitle'] = normalizeString(item.title).toUpperCase();
			item['normalizedObjective'] = normalizeString(
				extractTextFromHTML(item.objectives.join('\n'))
			).toUpperCase();
			item['normalizedOrganizers'] = normalizeString(
				item.organizers.map((org: any) => org.name).join(' ')
			).toUpperCase();
			item['normalizedMembers'] = normalizeString(
				item.outerRoles
					.map((role: any) =>
						role.members.items.map((item: any) => `${item.firstName} ${item.lastName}`).join(' ')
					)
					.join(' ')
			).toUpperCase();

			sessionsByDate[startDate].push(item);
		});

		document.addEventListener('scroll', onScroll);

		await searchSessions(searchInput.value);
	});

	onDestroy(() => {
		clearTimeout(timeout);
		searchVersion++;
		semanticRequest?.abort();
		if (typeof document !== 'undefined') {
			document.removeEventListener('scroll', onScroll);
		}
	});
</script>

<svelte:head>
	<title>JFR 2026</title>
	<meta name="description" content="Replays des Journées Francophones de Radiologie 2026" />
</svelte:head>

<header class="identity-header">
	<div class="identity-inner">
		<a href="{base}/" class="brand" aria-label="JFR 2026 — accueil">
			<img src={logoUrl} alt="" class="logo" />
			<span class="brand-copy"><strong>JFR 2026</strong><span>Replays</span></span>
		</a>
		<MediaHistoryButton />
	</div>
</header>
<div class="sticky-top" id="top-header">
	<div class="toolbar-inner">
		<div id="search-container">
			<IconSearch size={20} class="search-icon" aria-hidden="true" />
			<label for="search" class="visually-hidden">Rechercher une session</label>
			<input
				id="search"
				type="text"
				inputmode="search"
				enterkeyhint="search"
				autocomplete="off"
				placeholder="Titre, orateur, organisateur…"
				bind:this={searchInput}
				on:input={onSearch}
				on:keydown={(e) => e.key === 'Escape' && onDeleteSearch()}
			/>
			{#if showClearSearch}
				<button
					type="button"
					class="clear-search"
					aria-label="Effacer la recherche"
					on:click={onDeleteSearch}
				>
					<IconX size={18} aria-hidden="true" />
				</button>
			{/if}
		</div>
		<div class="filter-row">
			<div class="select-field day-field">
				<select
					class="day-select"
					aria-label="Filtrer par jour"
					bind:value={selectedDate}
					on:change={onFilterChange}
				>
					{#each Object.keys(sessionsByDate) as date}
						<option value={date}>{date ? dayLabel(new Date(date)) : 'Tous'}</option>
					{/each}
				</select>
				<IconChevronDown size={16} class="select-chevron" aria-hidden="true" />
			</div>
			<button
				type="button"
				class="btn video-filter"
				title="Afficher uniquement les sessions avec vidéos"
				aria-pressed={!!onlyVideos}
				on:click={() => {
					onlyVideos = !onlyVideos;
					onFilterChange();
				}}
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M8.50989 2.00001H15.49C15.7225 1.99995 15.9007 1.99991 16.0565 2.01515C17.1643 2.12352 18.0711 2.78958 18.4556 3.68678H5.54428C5.92879 2.78958 6.83555 2.12352 7.94337 2.01515C8.09917 1.99991 8.27741 1.99995 8.50989 2.00001Z"
						fill="currentColor"
					/>
					<path
						d="M6.31052 4.72312C4.91989 4.72312 3.77963 5.56287 3.3991 6.67691C3.39117 6.70013 3.38356 6.72348 3.37629 6.74693C3.77444 6.62636 4.18881 6.54759 4.60827 6.49382C5.68865 6.35531 7.05399 6.35538 8.64002 6.35547H15.5321C17.1181 6.35538 18.4835 6.35531 19.5639 6.49382C19.9833 6.54759 20.3977 6.62636 20.7958 6.74693C20.7886 6.72348 20.781 6.70013 20.773 6.67691C20.3925 5.56287 19.2522 4.72312 17.8616 4.72312H6.31052Z"
						fill="currentColor"
					/>
					<path
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M15.3276 7.54204H8.67239C5.29758 7.54204 3.61017 7.54204 2.66232 8.52887C1.71447 9.5157 1.93748 11.0403 2.38351 14.0896L2.80648 16.9811C3.15626 19.3724 3.33115 20.568 4.22834 21.284C5.12553 22 6.4488 22 9.09534 22H14.9046C17.5512 22 18.8745 22 19.7717 21.284C20.6689 20.568 20.8437 19.3724 21.1935 16.9811L21.6165 14.0896C22.0625 11.0404 22.2855 9.51569 21.3377 8.52887C20.3898 7.54204 18.7024 7.54204 15.3276 7.54204ZM14.5812 15.7942C15.1396 15.4481 15.1396 14.5519 14.5812 14.2058L11.2096 12.1156C10.6669 11.7792 10 12.2171 10 12.9099V17.0901C10 17.7829 10.6669 18.2208 11.2096 17.8844L14.5812 15.7942Z"
						fill="currentColor"
					/>
				</svg>
				<span>Vidéos</span>
			</button>
			<button
				type="button"
				class="btn sort-toggle"
				title="Trier par ordre alphabétique"
				aria-label="Trier par ordre alphabétique"
				aria-pressed={!!sortAlphabetically}
				on:click={() => {
					sortAlphabetically = !sortAlphabetically;
					onFilterChange();
				}}
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M10.22 15.97L9 17.19V5C9 4.59 8.66 4.25 8.25 4.25C7.84 4.25 7.5 4.59 7.5 5V17.19L6.28 15.97C5.99 15.68 5.51 15.68 5.22 15.97C4.93 16.26 4.93 16.74 5.22 17.03L7.72 19.53C7.79 19.6 7.87 19.65 7.96 19.69C8.05 19.73 8.15 19.75 8.25 19.75C8.35 19.75 8.45 19.73 8.54 19.69C8.63 19.65 8.71 19.6 8.78 19.53L11.28 17.03C11.57 16.74 11.57 16.26 11.28 15.97C10.99 15.68 10.51 15.68 10.22 15.97Z"
						fill="currentColor"
					></path>
					<path
						d="M14 11.21C14.39 11.35 14.82 11.15 14.96 10.76L15.24 9.98001H17.27L17.55 10.76C17.66 11.07 17.95 11.26 18.26 11.26C18.34 11.26 18.43 11.25 18.51 11.22C18.9 11.08 19.1 10.65 18.96 10.26L17.25 5.47001C17.08 5.04001 16.69 4.76001 16.25 4.76001C15.81 4.76001 15.42 5.04001 15.25 5.49001L13.55 10.26C13.41 10.65 13.61 11.08 14 11.22V11.21ZM16.73 8.48001H15.77L16.25 7.14001L16.73 8.48001Z"
						fill="currentColor"
					></path>
					<path
						d="M18.67 13.46C18.48 13.02 18.08 12.75 17.62 12.75H14.51C14.1 12.75 13.76 13.09 13.76 13.5C13.76 13.91 14.1 14.25 14.51 14.25H16.9L14.07 17.2C13.73 17.56 13.64 18.08 13.83 18.54C14.02 18.98 14.42 19.25 14.88 19.25H18.01C18.42 19.25 18.76 18.91 18.76 18.5C18.76 18.09 18.42 17.75 18.01 17.75H15.62L18.44 14.82C18.78 14.46 18.88 13.93 18.68 13.47L18.67 13.46Z"
						fill="currentColor"
					></path>
				</svg>
				<span>A–Z</span>
			</button>
		</div>
		<nav class="date-nav" aria-label="Filtrer par jour">
			{#each Object.keys(sessionsByDate) as date}
				<button
					type="button"
					class:selected={selectedDate === date}
					aria-pressed={selectedDate === date}
					on:click={() => onDateChange(date)}
					>{date ? getFriendlyDate(date) : 'Tous les jours'}</button
				>
			{/each}
		</nav>
	</div>
</div>

<main>
	{#if loading || (semanticPending && !filteredSessions?.length)}
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

	<div class="card-container">
		<div class="results-heading">
			<p class="result-count" aria-live="polite">
				{filteredSessions?.length ?? 0}
				{filteredSessions?.length === 1 ? 'session' : 'sessions'}
			</p>
			<p class="semantic-status" role="status">{semanticStatus || '\u00a0'}</p>
		</div>
		{#if !loading && filteredSessions && (!semanticPending || filteredSessions.length > 0)}
			{#if displaySessions && displaySessions.length > 0}
				<div class="session-list">
					{#each displaySessions as item (item.id)}
						<SessionCard info={item} semanticScore={semanticMatches.get(item.id)} />
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<p><strong>Aucun résultat</strong></p>
					<p>Essayez un autre mot-clé ou retirez des filtres.</p>
					{#if showClearSearch}
						<button type="button" class="btn" on:click={onDeleteSearch}>Effacer la recherche</button
						>
					{/if}
					{#if selectedDate || onlyVideos || sortAlphabetically}
						<button type="button" class="btn" on:click={resetFilters}
							>Réinitialiser les filtres</button
						>
					{/if}
				</div>
			{/if}
		{/if}
	</div>

	<BackToTop />
</main>

<style>
	.identity-inner,
	.toolbar-inner,
	.card-container {
		max-width: var(--content-width);
		margin: 0 auto;
	}
	.identity-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 18px 16px 12px;
	}
	.brand {
		flex: 1 1 auto;
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--text);
		min-width: 0;
	}
	.logo {
		width: 52px;
		height: 52px;
		object-fit: contain;
	}
	.brand-copy {
		display: flex;
		flex-direction: column;
	}
	.brand-copy strong {
		font-size: 1.55rem;
		line-height: 1.15;
		font-weight: 700;
	}
	.brand-copy > span {
		color: var(--text-muted);
		font-size: 1rem;
	}
	#top-header {
		border-bottom: 1px solid var(--border);
	}
	.toolbar-inner {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 12px;
		padding: 0 16px 12px;
	}
	#search-container {
		position: relative;
		display: flex;
		align-items: center;
		min-width: 0;
	}
	#search-container :global(.search-icon) {
		position: absolute;
		left: 12px;
		color: var(--text-muted);
		pointer-events: none;
	}
	#search {
		width: 100%;
		height: 44px;
		padding: 0 44px 0 40px;
		font-size: 16px;
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	#search::placeholder {
		color: var(--text-muted);
	}
	#search:focus {
		outline: 2px solid var(--link);
		outline-offset: 2px;
	}
	.clear-search {
		position: absolute;
		right: 0;
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}
	.filter-row {
		display: flex;
		gap: 8px;
		min-width: 0;
	}
	.select-field {
		position: relative;
		min-width: 0;
	}
	.select-field :global(.select-chevron) {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--text-muted);
	}
	.sort-toggle {
		flex: 0 0 auto;
	}
	select {
		appearance: none;
		width: 100%;
		min-width: 0;
		min-height: 44px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text);
		padding: 0 34px 0 10px;
		font-size: 1rem;
		cursor: pointer;
	}
	.day-field {
		display: none;
	}
	.date-nav {
		grid-column: 1 / -1;
		display: flex;
		gap: 4px;
		padding: 4px;
		background: var(--accent);
		border-radius: var(--radius);
	}
	.date-nav button {
		flex: 1;
		min-height: 44px;
		padding: 8px;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: white;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.date-nav button:hover {
		background: rgb(255 255 255 / 12%);
	}
	.date-nav button.selected {
		background: var(--highlight);
		color: var(--on-highlight);
	}
	.card-container {
		padding: 16px 16px 48px;
	}
	.results-heading {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 24px;
		margin-bottom: 12px;
	}
	.result-count {
		margin: 0;
		color: var(--text-muted);
		font-size: 1rem;
	}
	.semantic-status {
		flex: 1;
		min-height: 20px;
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}
	.session-list {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: clip;
		background: var(--surface);
	}
	.empty-state {
		padding: 48px 12px;
		text-align: center;
		color: var(--text-muted);
	}
	.empty-state strong {
		color: var(--text);
	}
	.empty-state .btn {
		margin: 6px;
		white-space: normal;
		height: auto;
		min-height: 44px;
	}
	@media (max-width: 720px) {
		.identity-inner {
			padding: 14px 12px 12px;
		}
		.logo {
			width: 48px;
			height: 48px;
		}
		.brand {
			gap: 8px;
		}
		.brand-copy strong {
			font-size: 1.3rem;
		}
		.brand-copy > span {
			font-size: 0.9rem;
		}
		.toolbar-inner {
			grid-template-columns: minmax(0, 1fr);
			padding: 0 12px 12px;
			gap: 12px;
		}
		.filter-row {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}
		.filter-row .select-field {
			flex: 1 1 4rem;
			min-width: min(100%, 4.5rem);
		}
		.day-field {
			display: block;
		}
		.video-filter,
		.sort-toggle {
			flex: 1 1 5rem;
			min-width: min(100%, 5rem);
			font-size: 1rem;
		}
		.video-filter {
			padding: 0 12px;
			font-size: 1rem;
		}
		.date-nav {
			display: none;
		}
		.card-container {
			padding: 16px 12px 48px;
		}
	}
	@media (max-width: 350px) {
		.brand-copy strong {
			font-size: 1.15rem;
		}
		.logo {
			width: 40px;
			height: 40px;
		}
		.identity-inner {
			gap: 8px;
		}
		select {
			padding: 0 30px 0 8px;
			font-size: 0.9rem;
		}
		.video-filter {
			padding: 0 8px;
			gap: 4px;
		}
	}
</style>
