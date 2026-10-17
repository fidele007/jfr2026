<script>
	export let showOnPx = 150;
	let hidden = true;
	function goTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
	function scrollContainer() {
		return document.documentElement || document.body;
	}
	function handleOnScroll() {
		if (!scrollContainer()) {
			return;
		}
		if (scrollContainer().scrollTop > showOnPx) {
			hidden = false;
		} else {
			hidden = true;
		}
	}
</script>

<svelte:window on:scroll={handleOnScroll} />
<button
	type="button"
	class="back-to-top"
	on:click={goTop}
	title="Revenir en haut"
	aria-label="Revenir en haut"
	class:hidden
	tabindex={hidden ? -1 : 0}
>
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M17 15L12 10L7 15"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
		></path>
	</svg>
</button>

<style>
	.back-to-top {
		display: flex;
		align-items: center;
		justify-content: center;
		position: fixed;
		z-index: 99;
		right: 20px;
		bottom: calc(20px + env(safe-area-inset-bottom));
		width: 44px;
		height: 44px;
		border: none;
		border-radius: 50%;
		background-color: var(--accent);
		color: #fff;
		box-shadow: 0 4px 14px rgb(0 0 0 / 30%);
		cursor: pointer;
		user-select: none;
		opacity: 1;
		transition:
			opacity 0.3s,
			visibility 0.3s,
			background-color 0.15s;
	}
	.back-to-top:hover {
		background-color: var(--accent-hover);
	}
	.back-to-top.hidden {
		opacity: 0;
		visibility: hidden;
	}
	@media (max-width: 720px) {
		.back-to-top {
			right: 14px;
			bottom: calc(14px + env(safe-area-inset-bottom));
		}
	}
</style>
