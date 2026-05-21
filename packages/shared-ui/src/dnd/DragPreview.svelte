<script lang="ts">
	/**
	 * Floating drag preview that follows the pointer during Layer 1 drags.
	 *
	 * Place this once in your app layout:
	 *   <DragPreview />
	 *
	 * It reads from dragState and renders a pill showing what's being dragged.
	 */

	import { dragState } from './drag-state.svelte';
	import type { TagDragData } from './types';

	interface Props {
		resolveEntity?: (
			type: string,
			data: Record<string, unknown>
		) => { title: string; subtitle?: string; color?: string; appName?: string } | null;
	}

	let { resolveEntity }: Props = $props();

	const OFFSET_X = 12;
	const OFFSET_Y = -20;

	const tagData = $derived(
		dragState.activeDrag?.type === 'tag'
			? (dragState.activeDrag.data as unknown as TagDragData)
			: null
	);

	const entityData = $derived(() => {
		if (!dragState.activeDrag || dragState.activeDrag.type === 'tag') return null;
		if (!resolveEntity) return null;
		return resolveEntity(
			dragState.activeDrag.type,
			dragState.activeDrag.data as Record<string, unknown>
		);
	});

	const style = $derived(
		dragState.isDragging
			? `left:${dragState.pointerX + OFFSET_X}px;top:${dragState.pointerY + OFFSET_Y}px;`
			: ''
	);
</script>

{#if dragState.isDragging}
	<div class="drag-preview" {style}>
		{#if tagData}
			<span class="preview-dot" style="background-color: {tagData.color}"></span>
			<span class="preview-title">{tagData.name}</span>
		{:else if entityData()}
			{@const entity = entityData()}
			{#if entity?.color}
				<span class="preview-dot" style="background-color: {entity.color}"></span>
			{:else}
				<span class="preview-dot fallback-dot"></span>
			{/if}
			<span class="preview-title">{entity?.title}</span>
			{#if entity?.appName}
				<span class="preview-app">{entity.appName}</span>
			{/if}
		{:else if dragState.activeDrag}
			<span class="preview-title fallback">{dragState.activeDrag.type}</span>
		{/if}
	</div>
{/if}

<style>
	.drag-preview {
		position: fixed;
		z-index: 9999;
		pointer-events: none;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		font-size: 0.8125rem;
		white-space: nowrap;
		max-width: 280px;
		transform: scale(1.05);
		animation: drag-preview-in 150ms ease-out;
		font-family: inherit;
	}

	@keyframes drag-preview-in {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1.05);
		}
	}

	.preview-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.fallback-dot {
		background: hsl(var(--color-muted-foreground));
	}

	.preview-title {
		font-weight: 600;
		color: hsl(var(--color-foreground));
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.preview-title.fallback {
		color: hsl(var(--color-muted-foreground));
		text-transform: capitalize;
		font-weight: 500;
	}

	.preview-app {
		font-size: 0.6875rem;
		font-weight: 400;
		color: hsl(var(--color-muted-foreground));
		flex-shrink: 0;
	}
</style>
