<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant =
		| 'neutral'
		| 'primary'
		| 'success'
		| 'warning'
		| 'error'
		| 'default'
		| 'info'
		| 'danger';
	type Size = 'sm' | 'md';

	interface Props {
		variant?: Variant;
		size?: Size;
		children?: Snippet;
	}

	let { variant = 'neutral', size = 'sm', children }: Props = $props();
</script>

<span class="badge badge-{variant} badge-{size}">
	{#if children}{@render children()}{/if}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 9999px;
		border: 1px solid transparent;
		font-weight: 500;
		white-space: nowrap;
		font-family: inherit;
	}

	.badge-sm {
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		line-height: 1.25;
	}
	.badge-md {
		padding: 0.25rem 0.625rem;
		font-size: 0.8125rem;
		line-height: 1.25;
	}

	.badge-neutral {
		background: hsl(var(--color-muted));
		color: hsl(var(--color-muted-foreground));
	}

	.badge-primary {
		background: hsl(var(--color-primary) / 0.12);
		color: hsl(var(--color-primary));
		border-color: hsl(var(--color-primary) / 0.3);
	}

	.badge-success {
		background: hsl(var(--color-success) / 0.12);
		color: hsl(var(--color-success));
		border-color: hsl(var(--color-success) / 0.3);
	}

	.badge-warning {
		background: hsl(var(--color-warning) / 0.15);
		color: hsl(var(--color-warning));
		border-color: hsl(var(--color-warning) / 0.4);
	}

	.badge-error,
	.badge-danger {
		background: hsl(var(--color-error) / 0.12);
		color: hsl(var(--color-error));
		border-color: hsl(var(--color-error) / 0.3);
	}

	/* v0.1.x-Compat */
	.badge-default {
		background: hsl(var(--color-surface));
		color: hsl(var(--color-muted-foreground));
		border-color: hsl(var(--color-border));
	}

	.badge-info {
		background: hsl(var(--color-primary) / 0.12);
		color: hsl(var(--color-primary));
		border-color: hsl(var(--color-primary) / 0.3);
	}
</style>
