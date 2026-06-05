<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { CalendarEvent } from '../types';
	import { eventsStore } from '../stores/events.svelte';
	import {
		CheckSquare,
		Clock,
		Timer,
		Lightning,
		CheckCircle,
		ArrowsClockwise,
	} from '@mana/shared-icons';

	interface Props {
		event: CalendarEvent;
		style: string;
		color: string;
		isDragging?: boolean;
		isResizing?: boolean;
		isDraggingSource?: boolean;
		formattedTime: string;
		onClick?: (event: CalendarEvent, e: MouseEvent) => void;
		onPointerDown?: (event: CalendarEvent, e: PointerEvent) => void;
		onContextMenu?: (event: CalendarEvent, e: MouseEvent) => void;
		onResizeStart?: (event: CalendarEvent, edge: 'top' | 'bottom', e: PointerEvent) => void;
	}

	let {
		event,
		style,
		color,
		isDragging = false,
		isResizing = false,
		isDraggingSource = false,
		formattedTime,
		onClick,
		onPointerDown,
		onContextMenu,
		onResizeStart,
	}: Props = $props();

	let isDraft = $derived(eventsStore.isDraftEvent(event.id));

	function handleClick(e: MouseEvent) {
		if (isDragging || isResizing || isDraft) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		onClick?.(event, e);
	}

	function handlePointerDown(e: PointerEvent) {
		onPointerDown?.(event, e);
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (isDraft) return;
		onContextMenu?.(event, e);
	}

	function handleResizeTop(e: PointerEvent) {
		e.stopPropagation();
		onResizeStart?.(event, 'top', e);
	}

	function handleResizeBottom(e: PointerEvent) {
		e.stopPropagation();
		onResizeStart?.(event, 'bottom', e);
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && !isDraft) {
			e.preventDefault();
			onClick?.(event, e as unknown as MouseEvent);
		}
	}
</script>

<div
	class="event-card block-type-{event.blockType}"
	class:dragging={isDragging && !isDraggingSource}
	class:dragging-source={isDraggingSource}
	class:resizing={isResizing}
	class:draft={isDraft}
	class:live={event.isLive}
	data-event-id={event.id}
	{style}
	style:background-color={color}
	role="button"
	tabindex="0"
	aria-label={event.title || $_('calendar.event_card.new_event_label')}
	onpointerdown={handlePointerDown}
	onclick={handleClick}
	onkeydown={handleKeydown}
	oncontextmenu={handleContextMenu}
>
	{#if onResizeStart}
		<div
			class="resize-handle top"
			onpointerdown={handleResizeTop}
			role="slider"
			aria-label={$_('calendar.event.changeStartTime')}
			aria-valuenow={0}
			tabindex="-1"
		></div>
	{/if}

	<div class="event-header-row">
		<!-- Type icon -->
		{#if event.blockType === 'task'}
			<span class="type-icon"><CheckSquare size={10} weight="bold" /></span>
		{:else if event.blockType === 'timeEntry'}
			<span class="type-icon"><Timer size={10} weight="bold" /></span>
		{:else if event.blockType === 'focus'}
			<span class="type-icon"><Lightning size={10} weight="bold" /></span>
		{/if}

		<span class="event-time">{formattedTime}</span>
		{#if event.parentBlockId}
			<span class="repeat-icon" title={$_('calendar.event_card.recurring_title')}
				><ArrowsClockwise size={9} /></span
			>
		{/if}
		{#if event.linkedBlockId}
			<span class="linked-badge" title={$_('calendar.event_card.linked_title')}
				><CheckCircle size={10} weight="fill" /></span
			>
		{/if}
	</div>
	<span class="event-title"
		>{event.title || (isDraft ? $_('calendar.event_card.new_event_label') : '')}</span
	>
	{#if event.location}
		<span class="event-location">{event.location}</span>
	{/if}

	{#if onResizeStart}
		<div
			class="resize-handle bottom"
			onpointerdown={handleResizeBottom}
			role="slider"
			aria-label={$_('calendar.event.changeEndTime')}
			aria-valuenow={0}
			tabindex="-1"
		></div>
	{/if}
</div>

<style>
	.event-card {
		position: absolute;
		left: 2px;
		right: 2px;
		padding: 2px 4px;
		border-radius: var(--radius-sm, 4px);
		text-align: left;
		cursor: grab;
		z-index: 1;
		overflow: hidden;
		transition:
			box-shadow 0.15s ease,
			opacity 0.15s ease;
		touch-action: none;
		user-select: none;
		color: white;
	}

	.event-card:hover {
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
	}

	.event-card:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 1px;
	}

	/* ─── Block-type visual differentiation ─── */

	.event-card.block-type-task {
		border-left: 3px solid rgba(255, 255, 255, 0.6);
	}

	.event-card.block-type-timeEntry {
		border-style: solid;
		border-width: 1px;
		border-color: rgba(255, 255, 255, 0.3);
		background-image: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 4px,
			rgba(255, 255, 255, 0.05) 4px,
			rgba(255, 255, 255, 0.05) 8px
		);
	}

	.event-card.block-type-focus {
		border: 2px dashed rgba(255, 255, 255, 0.5);
	}

	/* Live/running indicator */
	.event-card.live {
		animation: pulse-border 2s ease-in-out infinite;
	}

	@keyframes pulse-border {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
		}
		50% {
			box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
		}
	}

	/* ─── Drag/resize states ─── */

	.event-card.dragging {
		cursor: grabbing;
		opacity: 0.9;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
		z-index: 100;
	}

	.event-card.resizing {
		opacity: 0.85;
		z-index: 100;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
		outline: 2px dashed hsl(var(--color-primary) / 0.6);
		outline-offset: -2px;
	}

	.event-card.dragging-source {
		opacity: 0.4;
		background: transparent !important;
		border: 2px dashed hsl(var(--color-border));
		pointer-events: none;
	}

	.event-card.dragging-source .event-title,
	.event-card.dragging-source .event-time,
	.event-card.dragging-source .event-location {
		opacity: 0.5;
	}

	.event-card.draft {
		border: 2px dashed hsl(var(--color-primary) / 0.6);
		background-color: hsl(var(--color-primary) / 0.3) !important;
	}

	/* ─── Content ─── */

	.event-header-row {
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.type-icon {
		display: flex;
		align-items: center;
		opacity: 0.85;
		flex-shrink: 0;
	}

	.repeat-icon {
		display: flex;
		align-items: center;
		opacity: 0.6;
		flex-shrink: 0;
	}

	.linked-badge {
		display: flex;
		align-items: center;
		opacity: 0.9;
		color: rgba(255, 255, 255, 0.95);
		margin-left: auto;
		flex-shrink: 0;
	}

	.event-time {
		display: block;
		font-size: 0.6rem;
		opacity: 0.9;
	}

	.event-title {
		display: block;
		font-size: 0.7rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.event-location {
		display: block;
		font-size: 0.6rem;
		opacity: 0.85;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ─── Resize handles ─── */

	.resize-handle {
		position: absolute;
		left: 0;
		right: 0;
		height: 20px;
		cursor: ns-resize;
		opacity: 0;
		transition: opacity 0.15s ease;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.resize-handle::after {
		content: '';
		width: 32px;
		height: 4px;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 2px;
	}

	.resize-handle.top {
		top: -6px;
		border-radius: var(--radius-sm, 4px) var(--radius-sm, 4px) 0 0;
	}

	.resize-handle.bottom {
		bottom: -6px;
		border-radius: 0 0 var(--radius-sm, 4px) var(--radius-sm, 4px);
	}

	.event-card:hover .resize-handle,
	.event-card.resizing .resize-handle {
		opacity: 1;
		background: rgba(255, 255, 255, 0.15);
	}

	.event-card:hover .resize-handle::after,
	.event-card.resizing .resize-handle::after {
		background: rgba(255, 255, 255, 0.7);
	}
</style>
