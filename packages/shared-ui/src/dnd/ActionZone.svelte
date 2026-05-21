<script lang="ts">
	/**
	 * Drop zone that appears when a drag is active (Layer 1 or Layer 2).
	 */
	import { dragState } from './drag-state.svelte';
	import { dropTarget } from './drop-target';
	import { passiveDropZone } from './passive-drop';
	import type { DragPayload, DragType } from './types';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	type Variant = 'danger' | 'warning' | 'info' | 'success';

	interface Props {
		accepts: DragType[];
		onDrop: (payload: DragPayload) => void;
		canDrop?: (payload: DragPayload) => boolean;
		variant?: Variant;
		label?: string;
		/** Custom inline SVG path for the icon. Falls back to a per-variant default. */
		iconSvg?: string;
	}

	let { accepts, onDrop, canDrop, variant = 'danger', label = '', iconSvg }: Props = $props();

	const visible = $derived(dragState.anyDragActive);

	const defaultIconName = $derived.by(() => {
		if (variant === 'danger') return 'trash' as const;
		if (variant === 'warning') return 'archive' as const;
		if (variant === 'info') return 'info' as const;
		return 'check' as const;
	});

	function handleDrop(payload: DragPayload) {
		onDrop(payload);
	}
</script>

{#if visible}
	<div
		class="action-zone variant-{variant}"
		use:dropTarget={{ accepts, onDrop: handleDrop, canDrop }}
		use:passiveDropZone={{
			accepts,
			onDrop: handleDrop,
			canDrop,
			highlightClass: 'action-zone-active',
		}}
		role="button"
		tabindex="-1"
	>
		{#if iconSvg}
			<DynamicIcon {iconSvg} size="lg" />
		{:else}
			<DynamicIcon name={defaultIconName} size="lg" />
		{/if}
		{#if label}
			<span class="action-label">{label}</span>
		{/if}
	</div>
{/if}

<style>
	.action-zone {
		position: fixed;
		bottom: calc(120px + env(safe-area-inset-bottom, 0px));
		left: 50%;
		transform: translateX(-50%);
		z-index: 60;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 9999px;
		border-width: 1.5px;
		border-style: solid;
		transition:
			background-color 200ms ease,
			border-color 200ms ease,
			transform 200ms ease;
		animation: action-zone-in 200ms ease-out;
		cursor: default;
		font-family: inherit;
	}

	@keyframes action-zone-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(20px) scale(0.9);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0) scale(1);
		}
	}

	.action-label {
		font-size: 0.875rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.variant-danger {
		background: hsl(var(--color-error) / 0.15);
		border-color: hsl(var(--color-error) / 0.3);
		color: hsl(var(--color-error));
	}

	.variant-warning {
		background: hsl(var(--color-warning) / 0.15);
		border-color: hsl(var(--color-warning) / 0.3);
		color: hsl(var(--color-warning));
	}

	.variant-info {
		background: hsl(var(--color-primary) / 0.15);
		border-color: hsl(var(--color-primary) / 0.3);
		color: hsl(var(--color-primary));
	}

	.variant-success {
		background: hsl(var(--color-success) / 0.15);
		border-color: hsl(var(--color-success) / 0.3);
		color: hsl(var(--color-success));
	}

	:global(.action-zone.mana-drop-target-hover),
	:global(.action-zone.action-zone-active) {
		transform: translateX(-50%) scale(1.1);
	}

	:global(.variant-danger.mana-drop-target-hover),
	:global(.variant-danger.action-zone-active) {
		background: hsl(var(--color-error) / 0.3);
		border-color: hsl(var(--color-error) / 0.6);
	}

	:global(.variant-warning.mana-drop-target-hover),
	:global(.variant-warning.action-zone-active) {
		background: hsl(var(--color-warning) / 0.3);
		border-color: hsl(var(--color-warning) / 0.6);
	}

	:global(.variant-info.mana-drop-target-hover),
	:global(.variant-info.action-zone-active) {
		background: hsl(var(--color-primary) / 0.3);
		border-color: hsl(var(--color-primary) / 0.6);
	}

	:global(.variant-success.mana-drop-target-hover),
	:global(.variant-success.action-zone-active) {
		background: hsl(var(--color-success) / 0.3);
		border-color: hsl(var(--color-success) / 0.6);
	}

	:global(.action-zone.mana-drop-target-success),
	:global(.action-zone.mana-passive-zone-success) {
		animation: action-success 400ms ease-out;
	}

	@keyframes action-success {
		0% {
			transform: translateX(-50%) scale(1.15);
		}
		50% {
			transform: translateX(-50%) scale(0.95);
		}
		100% {
			transform: translateX(-50%) scale(1);
		}
	}
</style>
