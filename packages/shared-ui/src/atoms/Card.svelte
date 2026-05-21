<script lang="ts">
	import type { Snippet } from 'svelte';

	type Padding = 'none' | 'sm' | 'md' | 'lg';

	interface Props {
		padding?: Padding;
		interactive?: boolean;
		ariaLabel?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
		/** v0.1.x-Compat: zusätzliche CSS-Klassen auf dem Wrapper. */
		class?: string;
	}

	let {
		padding = 'md',
		interactive = false,
		ariaLabel,
		onclick,
		children,
		class: className = '',
	}: Props = $props();
</script>

{#if interactive}
	<button
		class="card card-{padding} interactive {className}"
		aria-label={ariaLabel}
		{onclick}
		type="button"
	>
		{#if children}{@render children()}{/if}
	</button>
{:else}
	<div class="card card-{padding} {className}">
		{#if children}{@render children()}{/if}
	</div>
{/if}

<style>
	.card {
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.75rem;
		color: hsl(var(--color-foreground));
		font-family: inherit;
		text-align: inherit;
		width: 100%;
		display: block;
	}

	.card-none {
		padding: 0;
	}
	.card-sm {
		padding: 0.75rem;
	}
	.card-md {
		padding: 1rem;
	}
	.card-lg {
		padding: 1.5rem;
	}

	button.card.interactive {
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease;
	}

	button.card.interactive:hover {
		background: hsl(var(--color-surface-hover));
		border-color: hsl(var(--color-primary) / 0.3);
	}

	button.card.interactive:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		button.card.interactive {
			transition: none;
		}
	}
</style>
