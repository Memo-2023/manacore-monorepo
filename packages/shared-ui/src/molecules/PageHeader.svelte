<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		/** Alias für subtitle (v0.1.x-Compat). */
		description?: string;
		eyebrow?: string;
		actions?: Snippet;
		breadcrumb?: Snippet;
		/** v0.1.x-Compat: heute ignoriert, alle Header rendern in der gleichen Größe. */
		size?: 'sm' | 'md' | 'lg';
		/** v0.1.x-Compat: Header zentrieren statt links-bündig. */
		centered?: boolean;
		/** v0.1.x-Compat. */
		class?: string;
	}

	let { title, subtitle, description, eyebrow, actions, breadcrumb }: Props = $props();
	const effectiveSubtitle = $derived(subtitle ?? description);
</script>

<header class="page-header">
	{#if breadcrumb}
		<div class="breadcrumb">{@render breadcrumb()}</div>
	{/if}
	<div class="header-row">
		<div class="header-text">
			{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
			<h1 class="title">{title}</h1>
			{#if effectiveSubtitle}<p class="subtitle">{effectiveSubtitle}</p>{/if}
		</div>
		{#if actions}
			<div class="header-actions">{@render actions()}</div>
		{/if}
	</div>
</header>

<style>
	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-bottom: 1rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid hsl(var(--color-border));
		font-family: inherit;
	}

	.breadcrumb {
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
	}

	.header-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.header-text {
		flex: 1;
		min-width: 0;
	}

	.eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--color-muted-foreground));
	}

	.title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.25;
		color: hsl(var(--color-foreground));
	}

	.subtitle {
		margin: 0.375rem 0 0;
		font-size: 0.9375rem;
		color: hsl(var(--color-muted-foreground));
		line-height: 1.45;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		flex-shrink: 0;
	}
</style>
