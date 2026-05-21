<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		ariaLabel?: string;
		sticky?: boolean;
		brand?: Snippet;
		nav?: Snippet;
		actions?: Snippet;
	}

	let { ariaLabel, sticky = true, brand, nav, actions }: Props = $props();
</script>

<header class="navbar" class:sticky aria-label={ariaLabel}>
	<div class="inner">
		{#if brand}<div class="brand">{@render brand()}</div>{/if}
		{#if nav}<nav class="nav" aria-label={ariaLabel}>{@render nav()}</nav>{/if}
		{#if actions}<div class="actions">{@render actions()}</div>{/if}
	</div>
</header>

<style>
	.navbar {
		width: 100%;
		background: hsl(var(--color-surface));
		border-bottom: 1px solid hsl(var(--color-border));
	}

	.navbar.sticky {
		position: sticky;
		top: 0;
		z-index: 40;
	}

	.inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		max-width: 72rem;
		margin: 0 auto;
		padding: 0.75rem 1rem;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.actions {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}
</style>
