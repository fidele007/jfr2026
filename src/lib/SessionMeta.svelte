<script lang="ts">
	import { IconCalendar, IconClock } from '@tabler/icons-svelte';
	import { getFriendlyDate } from './Constants.svelte';
	export let start: string | null | undefined;
	export let end: string | null | undefined = undefined;
	export let dateUnknown = false;
	const time = (value: string | null | undefined) => value?.split('T')[1]?.slice(0, 5) ?? value?.slice(0, 5);
</script>

<div class="session-meta">
	{#if start?.includes('T')}
		<span><IconCalendar size={16} aria-hidden="true" />{getFriendlyDate(start.split('T')[0])}</span>
	{:else if dateUnknown}
		<span><IconCalendar size={16} aria-hidden="true" />N/A</span>
	{/if}
	{#if start || end}
		<span
			><IconClock size={16} aria-hidden="true" />{time(start)}{#if end}
				– {time(end)}{/if}</span
		>
	{/if}
</div>

<style>
	.session-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
		color: var(--text-muted);
		font-size: 0.875rem;
		line-height: 1.4;
	}
	span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	span :global(svg) {
		flex-shrink: 0;
	}
</style>
