<script lang="ts">
	type Shape = 'rect' | 'line' | 'circle' | 'card';

	interface Props {
		shape?: Shape;
		width?: string;
		height?: string;
		count?: number;
		ariaLabel?: string;
	}

	let { shape = 'rect', width, height, count = 1, ariaLabel = 'Lade Inhalt …' }: Props = $props();
</script>

{#if shape === 'card'}
	<div
		class="skeleton-card"
		style:width
		style:height
		role="status"
		aria-busy="true"
		aria-label={ariaLabel}
	>
		<div class="skeleton shape-line" style:width="40%"></div>
		<div class="skeleton shape-line" style:width="100%"></div>
		<div class="skeleton shape-line" style:width="80%"></div>
	</div>
{:else if count > 1}
	<div role="status" aria-busy="true" aria-label={ariaLabel} class="skeleton-stack">
		{#each Array(count) as _, i (i)}
			<div class="skeleton shape-{shape}" style:width style:height></div>
		{/each}
	</div>
{:else}
	<div
		class="skeleton shape-{shape}"
		style:width
		style:height
		role="status"
		aria-busy="true"
		aria-label={ariaLabel}
	></div>
{/if}

<style>
	.skeleton {
		background: hsl(var(--color-muted));
		position: relative;
		overflow: hidden;
	}

	.skeleton::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, hsl(var(--color-surface) / 0.6), transparent);
		animation: shimmer 1.6s linear infinite;
	}

	.shape-rect {
		border-radius: 0.375rem;
		min-height: 1rem;
	}

	.shape-line {
		border-radius: 0.25rem;
		height: 0.875rem;
	}

	.shape-circle {
		border-radius: 9999px;
		aspect-ratio: 1;
		min-height: 2rem;
	}

	.skeleton-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.75rem;
	}

	.skeleton-stack {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-stack > .skeleton {
		min-height: 0.875rem;
	}

	@keyframes shimmer {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton::after {
			animation: none;
			background: hsl(var(--color-surface) / 0.4);
		}
	}
</style>
