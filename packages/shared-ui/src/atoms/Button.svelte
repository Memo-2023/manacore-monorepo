<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'default' | 'info';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		ariaLabel?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
		leading?: Snippet;
		trailing?: Snippet;
		/** v0.1.x-Compat. */
		class?: string;
	}

	let {
		variant = 'secondary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		fullWidth = false,
		ariaLabel,
		class: className = '',
		onclick,
		children,
		leading,
		trailing,
	}: Props = $props();
</script>

<button
	{type}
	class="btn btn-{variant} btn-{size} {className}"
	class:full={fullWidth}
	class:loading
	disabled={disabled || loading}
	aria-label={ariaLabel}
	aria-busy={loading || undefined}
	{onclick}
>
	{#if leading}
		<span class="leading">{@render leading()}</span>
	{/if}
	{#if loading}
		<span class="spinner" aria-hidden="true"></span>
	{/if}
	{#if children}
		<span class="label">{@render children()}</span>
	{/if}
	{#if trailing}
		<span class="trailing">{@render trailing()}</span>
	{/if}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
		font-family: inherit;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.btn.full {
		width: 100%;
	}

	/* sizes */
	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
	}
	.btn-md {
		padding: 0.5rem 1rem;
		font-size: 0.9375rem;
	}
	.btn-lg {
		padding: 0.75rem 1.25rem;
		font-size: 1rem;
	}

	/* primary */
	.btn-primary {
		background: hsl(var(--color-primary));
		color: hsl(var(--color-primary-foreground));
	}
	.btn-primary:not(:disabled):hover {
		background: hsl(var(--color-primary) / 0.9);
	}

	/* secondary */
	.btn-secondary {
		background: hsl(var(--color-surface));
		color: hsl(var(--color-foreground));
		border-color: hsl(var(--color-border));
	}
	.btn-secondary:not(:disabled):hover {
		background: hsl(var(--color-surface-hover));
	}

	/* ghost */
	.btn-ghost {
		background: transparent;
		color: hsl(var(--color-foreground));
	}
	.btn-ghost:not(:disabled):hover {
		background: hsl(var(--color-surface-hover));
	}

	/* danger */
	.btn-danger {
		background: hsl(var(--color-error) / 0.1);
		color: hsl(var(--color-error));
		border-color: hsl(var(--color-error) / 0.3);
	}
	.btn-danger:not(:disabled):hover {
		background: hsl(var(--color-error) / 0.15);
		border-color: hsl(var(--color-error) / 0.5);
	}

	/* v0.1.x-Compat: 'default' = secondary, 'info' = ghost mit primary-Akzent */
	.btn-default {
		background: hsl(var(--color-surface));
		color: hsl(var(--color-foreground));
		border-color: hsl(var(--color-border));
	}
	.btn-default:not(:disabled):hover {
		background: hsl(var(--color-surface-hover));
	}
	.btn-info {
		background: hsl(var(--color-primary) / 0.1);
		color: hsl(var(--color-primary));
		border-color: hsl(var(--color-primary) / 0.3);
	}
	.btn-info:not(:disabled):hover {
		background: hsl(var(--color-primary) / 0.15);
	}

	/* spinner */
	.spinner {
		width: 0.875em;
		height: 0.875em;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.btn {
			transition: none;
		}
		.spinner {
			animation: none;
			border-right-color: currentColor;
		}
	}
</style>
