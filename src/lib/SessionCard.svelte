<script lang="ts">
	import { base } from '$app/paths';
	import { IconUsers, IconPlayerPlayFilled } from '@tabler/icons-svelte';
	import SessionMeta from './SessionMeta.svelte';
	import { speakerSummary } from './media-ui';

	export let info: any;
	export let semanticScore: number | undefined = undefined;

	$: hasSemanticMatch = semanticScore !== undefined && Number.isFinite(semanticScore);
	// Conservative display tier for the current E5 hybrid scores, not a confidence estimate.
	$: matchLabel =
		semanticScore !== undefined && semanticScore >= 0.92 ? 'Très pertinent' : 'Sujet proche';
	$: scoreDescription = hasSemanticMatch
		? `Score de classement : ${semanticScore!.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}. Combine proximité de sens et mots-clés ; ce n'est pas un pourcentage de confiance.`
		: '';

	$: speakers = info.outerRoles?.find((role: any) => role.name === 'speaker')?.members.items ?? [];
	$: summary = speakerSummary(speakers);
	$: tags = info.tracks?.map((track: any) => track.label) as string[] | undefined;
	let failedImage: string | undefined;
	$: typeColor = info.sessionTypeColor !== '#000000' ? info.sessionTypeColor : 'var(--text-muted)';
</script>

<a
	class="card"
	href="{base}/session?id={info.id}"
	style="--type-color: {typeColor}"
	aria-labelledby={`session-title-${info.id}`}
	aria-describedby={hasSemanticMatch ? `match-score-${info.id}` : undefined}
>
	<div class="card-heading">
		<div class="card-type">{info.sessionType}</div>
		{#if hasSemanticMatch}
			<span class="semantic-match">
				{matchLabel}
				<span class="score-tooltip" role="tooltip" id="match-score-{info.id}"
					>{scoreDescription}</span
				>
			</span>
		{/if}
		<h2 class="card-title" id="session-title-{info.id}">{info.title}</h2>
	</div>
	<div class="card-details">
		<SessionMeta start={info.start} end={info.end} />
		{#if summary}<p class="speaker-summary">
				<IconUsers size={16} aria-hidden="true" /><span>{summary}</span>
			</p>{/if}
		{#if tags && tags.length > 0}
			<div class="tag-list">
				{#each tags as tag}
					<span class="tag-name">{tag}</span>
				{/each}
			</div>
		{/if}
	</div>
	{#if info.picture && failedImage !== info.picture}
		<div class="thumbnail-container">
			<img
				src={info.picture}
				alt=""
				class="thumbnail"
				loading="lazy"
				decoding="async"
				on:error={() => (failedImage = info.picture)}
			/>
			<span class="play-badge" aria-hidden="true">
				<IconPlayerPlayFilled size={14} />
			</span>
			<span class="visually-hidden">Vidéos disponibles</span>
		</div>
	{/if}
</a>

<style>
	.card {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 200px;
		align-items: center;
		column-gap: 20px;
		row-gap: 10px;
		padding: 22px 24px;
		color: inherit;
		font-weight: normal;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
	.card:last-child {
		border-bottom: 0;
	}
	.card:hover {
		background: var(--surface-hover);
	}
	.card:focus-visible {
		outline-offset: -3px;
		z-index: 1;
	}
	.card-heading,
	.card-details {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		min-width: 0;
	}
	.card-type {
		padding-left: 12px;
		border-left: 3px solid var(--type-color);
		color: var(--link);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}
	.card-title {
		margin: 0 0 4px;
		font-size: 1.15rem;
		font-weight: 700;
		line-height: 1.3;
		overflow-wrap: anywhere;
	}
	.speaker-summary {
		display: flex;
		align-items: baseline;
		gap: 6px;
		margin: 0;
		color: var(--text-muted);
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.speaker-summary :global(svg) {
		flex: 0 0 16px;
		align-self: flex-start;
		margin-top: 2px;
	}
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.tag-name {
		background: rgb(35 184 42 / 10%);
		color: var(--text-muted);
		border-radius: 20px;
		padding: 2px 8px;
		font-size: 0.75rem;
	}
	.thumbnail-container {
		grid-column: 2;
		grid-row: 1 / span 2;
		position: relative;
		width: 200px;
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
	.card:not(:has(.thumbnail-container)) {
		grid-template-columns: minmax(0, 1fr);
	}
	.play-badge {
		position: absolute;
		right: 4px;
		bottom: 4px;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgb(0 0 0 / 65%);
		color: white;
	}
	.semantic-match {
		position: relative;
		font-size: 0.75rem;
		color: var(--text-muted);
		border-bottom: 1px dotted currentColor;
	}
	.score-tooltip {
		display: none;
		position: absolute;
		z-index: 2;
		top: calc(100% + 6px);
		left: 0;
		width: min(280px, 65vw);
		padding: 8px 10px;
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		line-height: 1.5;
	}
	.semantic-match:hover .score-tooltip,
	.card:focus-visible .score-tooltip {
		display: block;
	}
	@media (max-width: 720px) {
		.card {
			display: flex;
			flex-wrap: wrap;
			grid-template-columns: minmax(0, 1fr) 144px;
			gap: 12px;
			padding: 18px 14px;
		}
		.card-heading {
			flex: 1 1 100%;
			grid-column: 1 / -1;
			gap: 7px;
		}
		.card-details {
			flex: 1 1 7rem;
			overflow-wrap: anywhere;
			grid-column: 1;
			gap: 7px;
		}
		.card-title {
			font-size: 1rem;
			line-height: 1.3;
		}
		.card-type {
			font-size: 0.7rem;
			padding-left: 8px;
		}
		.thumbnail-container {
			flex: 0 0 144px;
			grid-row: 2;
			width: 144px;
		}
		.speaker-summary {
			font-size: 0.85rem;
		}
	}
	@media (max-width: 350px) {
		.card {
			gap: 10px;
			padding: 16px 12px;
			grid-template-columns: minmax(0, 1fr) 128px;
		}
		.thumbnail-container {
			flex-basis: 128px;
			width: 128px;
		}
	}
</style>
