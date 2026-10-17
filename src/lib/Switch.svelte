<script lang="ts">
	export let checked = false;
	export const color = 'var(--accent)';
</script>

<label class="switch-container" title="Enchaîner automatiquement la vidéo suivante">
	<span class="switch" style="--switch-color: {color};">
		<input type="checkbox" role="switch" bind:checked />
		<span class="slider"></span>
	</span>
	<span>Lecture auto</span>
</label>

<style>
	.switch-container {
		display: flex;
		gap: 8px;
		align-items: center;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		user-select: none;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 22px;
	}

	.switch input {
		position: absolute;
		opacity: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		cursor: pointer;
	}

	.slider {
		position: absolute;
		inset: 0;
		background-color: var(--border);
		transition: 0.2s;
		border-radius: 34px;
		pointer-events: none;
	}

	.slider:before {
		position: absolute;
		content: '';
		height: 16px;
		width: 16px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.2s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: var(--switch-color);
	}

	input:focus-visible + .slider {
		outline: 2px solid var(--highlight);
		outline-offset: 2px;
	}

	input:checked + .slider:before {
		transform: translateX(18px);
	}
</style>
