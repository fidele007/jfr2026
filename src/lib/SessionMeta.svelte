<script lang="ts">
	import { IconCalendar, IconClock } from '@tabler/icons-svelte';
	import { getFriendlyDate } from './Constants.svelte';
	export let start: string;
	export let end: string | undefined = undefined;
	const time = (value: string) => value?.split('T')[1]?.slice(0, 5) ?? value?.slice(0, 5);
</script>

<div class="session-meta">
	{#if start?.includes('T')}
		<span><IconCalendar size={16} aria-hidden="true" />{getFriendlyDate(start.split('T')[0])}</span>
	{/if}
	<span
		><IconClock size={16} aria-hidden="true" />{time(start)}{#if end}
			– {time(end)}{/if}</span
	>
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
