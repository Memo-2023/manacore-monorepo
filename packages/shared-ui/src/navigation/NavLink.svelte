<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href: string;
		active?: boolean;
		ariaLabel?: string;
		title?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
		leading?: Snippet;
	}

	let { href, active = false, ariaLabel, title, onclick, children, leading }: Props = $props();
</script>

<a
	{href}
	class="nav-link"
	class:active
	aria-current={active ? 'page' : undefined}
	aria-label={ariaLabel}
	{title}
	{onclick}
>
	{#if leading}<span class="leading">{@render leading()}</span>{/if}
	{#if children}<span>{@render children()}</span>{/if}
</a>

<style>
	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0;
		color: hsl(var(--color-muted-foreground));
		text-decoration: none;
		font: inherit;
		font-weight: 500;
		border-bottom: 2px solid transparent;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.nav-link:hover {
		color: hsl(var(--color-foreground));
	}

	.nav-link:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
		border-radius: 2px;
	}

	.nav-link.active {
		color: hsl(var(--color-primary));
		border-color: hsl(var(--color-primary));
	}

	.leading {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-link {
			transition: none;
		}
	}
</style>
