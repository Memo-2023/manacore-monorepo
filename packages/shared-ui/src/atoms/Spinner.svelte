<script lang="ts">
	type Size = 'xs' | 'sm' | 'md' | 'lg';
	type Tone = 'default' | 'muted' | 'primary' | 'inherit';

	interface Props {
		size?: Size;
		tone?: Tone;
		ariaLabel?: string;
		/** v0.1.x-Compat. */
		class?: string;
	}

	let {
		size = 'md',
		tone = 'inherit',
		ariaLabel = 'Lade …',
		class: className = '',
	}: Props = $props();
</script>

<span
	class="spinner size-{size} tone-{tone} {className}"
	role="status"
	aria-live="polite"
	aria-label={ariaLabel}
></span>

<style>
	.spinner {
		display: inline-block;
		border-style: solid;
		border-radius: 50%;
		border-right-color: transparent;
		animation: spin 0.6s linear infinite;
	}

	.size-xs {
		width: 0.75rem;
		height: 0.75rem;
		border-width: 1.5px;
	}
	.size-sm {
		width: 1rem;
		height: 1rem;
		border-width: 2px;
	}
	.size-md {
		width: 1.5rem;
		height: 1.5rem;
		border-width: 2px;
	}
	.size-lg {
		width: 2rem;
		height: 2rem;
		border-width: 2.5px;
	}

	.tone-default {
		border-color: hsl(var(--color-foreground));
		border-right-color: transparent;
	}
	.tone-muted {
		border-color: hsl(var(--color-muted-foreground));
		border-right-color: transparent;
	}
	.tone-primary {
		border-color: hsl(var(--color-primary));
		border-right-color: transparent;
	}
	.tone-inherit {
		border-color: currentColor;
		border-right-color: transparent;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
			/* Static ring full-color so it remains a meaningful loading indicator */
			border-right-color: currentColor;
		}
		.tone-default,
		.tone-muted,
		.tone-primary {
			border-right-color: inherit;
		}
	}
</style>
