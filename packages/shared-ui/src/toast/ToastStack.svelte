<script lang="ts">
	import { toasts, type Toast } from './store.svelte';

	type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'top-center';

	interface Props {
		position?: Position;
		closeLabel?: string;
		ariaLabel?: string;
	}

	let {
		position = 'bottom-right',
		closeLabel = 'Schließen',
		ariaLabel = 'Benachrichtigungen',
	}: Props = $props();

	function dismiss(t: Toast) {
		toasts.dismiss(t.id);
	}
</script>

{#if toasts.items.length > 0}
	<div class="stack pos-{position}" role="region" aria-live="polite" aria-label={ariaLabel}>
		{#each toasts.items as t (t.id)}
			<div
				class="toast kind-{t.kind}"
				role={t.kind === 'error' ? 'alert' : 'status'}
				aria-atomic="true"
			>
				<span class="dot" aria-hidden="true"></span>
				<span class="message">{t.message}</span>
				<button class="close" type="button" aria-label={closeLabel} onclick={() => dismiss(t)}>
					×
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.stack {
		position: fixed;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 9999;
		max-width: min(28rem, calc(100vw - 2rem));
		pointer-events: none;
	}

	.pos-bottom-right {
		bottom: 1rem;
		right: 1rem;
	}
	.pos-bottom-left {
		bottom: 1rem;
		left: 1rem;
	}
	.pos-top-right {
		top: 1rem;
		right: 1rem;
	}
	.pos-top-left {
		top: 1rem;
		left: 1rem;
	}
	.pos-top-center {
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		align-items: center;
	}

	.toast {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.75rem 0.875rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.625rem;
		color: hsl(var(--color-foreground));
		box-shadow:
			0 4px 12px hsl(var(--color-foreground) / 0.1),
			0 1px 3px hsl(var(--color-foreground) / 0.05);
		font-size: 0.875rem;
		pointer-events: auto;
		animation: slide-in 0.2s ease-out;
	}

	.dot {
		flex-shrink: 0;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		margin-top: 0.4375rem;
	}

	.kind-info .dot {
		background: hsl(var(--color-primary));
	}
	.kind-success .dot {
		background: hsl(var(--color-success));
	}
	.kind-warning .dot {
		background: hsl(var(--color-warning));
	}
	.kind-error .dot {
		background: hsl(var(--color-error));
	}

	.kind-error {
		border-color: hsl(var(--color-error) / 0.4);
	}
	.kind-warning {
		border-color: hsl(var(--color-warning) / 0.4);
	}

	.message {
		flex: 1;
		line-height: 1.4;
	}

	.close {
		flex-shrink: 0;
		background: transparent;
		border: none;
		color: hsl(var(--color-muted-foreground));
		font-size: 1.125rem;
		line-height: 1;
		padding: 0 0.25rem;
		cursor: pointer;
		font-family: inherit;
	}
	.close:hover {
		color: hsl(var(--color-foreground));
	}
	.close:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
		border-radius: 2px;
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateY(0.5rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
	}
</style>
