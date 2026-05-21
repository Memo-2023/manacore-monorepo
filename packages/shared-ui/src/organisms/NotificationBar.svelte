<script lang="ts">
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	export type NotificationType = 'info' | 'warning' | 'error';

	export interface BottomNotification {
		id: string;
		message: string;
		type: NotificationType;
		/** Optionale Aktion mit Label + Click. `icon` ist v0.1.x-Compat (wird heute ignoriert). */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		action?: { label: string; onClick: () => void; icon?: any };
		dismissible?: boolean;
		onDismiss?: () => void;
	}

	interface Props {
		notifications: BottomNotification[];
	}

	let { notifications }: Props = $props();

	const PRIORITY: Record<NotificationType, number> = { error: 3, warning: 2, info: 1 };

	const active = $derived(
		notifications.length > 0
			? [...notifications].sort((a, b) => PRIORITY[b.type] - PRIORITY[a.type])[0]
			: null
	);

	function handleDismiss() {
		if (active?.onDismiss) active.onDismiss();
	}
</script>

{#if active}
	<div
		class="notification-bar"
		class:warning={active.type === 'warning'}
		class:error={active.type === 'error'}
		role={active.type === 'error' ? 'alert' : 'status'}
	>
		<p class="message">{active.message}</p>
		<div class="actions">
			{#if active.action}
				<button class="action-btn" type="button" onclick={active.action.onClick}>
					{active.action.label}
					<DynamicIcon name="arrow-right" size="xs" />
				</button>
			{/if}
			{#if active.dismissible !== false}
				<button class="dismiss-btn" type="button" onclick={handleDismiss} aria-label="Schließen">
					<DynamicIcon name="x" size="sm" />
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.notification-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.625rem 0.625rem 1rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.875rem;
		max-width: 480px;
		width: max-content;
		animation: slideUp 220ms ease-out;
	}

	.notification-bar.warning {
		border-color: hsl(var(--color-warning));
	}

	.notification-bar.error {
		border-color: hsl(var(--color-error));
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.message {
		flex: 1;
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.4;
		color: hsl(var(--color-foreground));
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--color-primary-foreground));
		background: hsl(var(--color-primary));
		border: none;
		border-radius: 0.625rem;
		cursor: pointer;
		transition: background-color 120ms;
		white-space: nowrap;
		font-family: inherit;
	}

	.action-btn:hover {
		background: hsl(var(--color-primary) / 0.9);
	}

	.action-btn:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.dismiss-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		color: hsl(var(--color-muted-foreground));
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition:
			background-color 120ms,
			color 120ms;
	}

	.dismiss-btn:hover {
		background: hsl(var(--color-surface-hover));
		color: hsl(var(--color-foreground));
	}

	.dismiss-btn:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	@media (max-width: 480px) {
		.notification-bar {
			max-width: calc(100vw - 2rem);
		}
	}
</style>
