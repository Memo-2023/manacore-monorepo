<script lang="ts">
	import type { Snippet } from 'svelte';

	type As = 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
	type Tone = 'default' | 'muted' | 'primary' | 'error' | 'success' | 'warning';
	type Size = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
	type Weight = 'normal' | 'medium' | 'semibold' | 'bold';

	interface Props {
		as?: As;
		tone?: Tone;
		size?: Size;
		weight?: Weight;
		truncate?: boolean;
		ariaLabel?: string;
		id?: string;
		children?: Snippet;
	}

	let {
		as = 'p',
		tone = 'default',
		size = 'base',
		weight = 'normal',
		truncate = false,
		ariaLabel,
		id,
		children,
	}: Props = $props();
</script>

<svelte:element
	this={as}
	class="text tone-{tone} size-{size} weight-{weight}"
	class:truncate
	aria-label={ariaLabel}
	{id}
>
	{#if children}{@render children()}{/if}
</svelte:element>

<style>
	.text {
		margin: 0;
		font-family: inherit;
		line-height: 1.5;
	}

	.truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* tones */
	.tone-default {
		color: hsl(var(--color-foreground));
	}
	.tone-muted {
		color: hsl(var(--color-muted-foreground));
	}
	.tone-primary {
		color: hsl(var(--color-primary));
	}
	.tone-error {
		color: hsl(var(--color-error));
	}
	.tone-success {
		color: hsl(var(--color-success));
	}
	.tone-warning {
		color: hsl(var(--color-warning));
	}

	/* sizes */
	.size-xs {
		font-size: 0.75rem;
	}
	.size-sm {
		font-size: 0.875rem;
	}
	.size-base {
		font-size: 1rem;
	}
	.size-lg {
		font-size: 1.125rem;
		line-height: 1.4;
	}
	.size-xl {
		font-size: 1.25rem;
		line-height: 1.35;
	}
	.size-2xl {
		font-size: 1.5rem;
		line-height: 1.3;
	}

	/* weights */
	.weight-normal {
		font-weight: 400;
	}
	.weight-medium {
		font-weight: 500;
	}
	.weight-semibold {
		font-weight: 600;
	}
	.weight-bold {
		font-weight: 700;
	}
</style>
