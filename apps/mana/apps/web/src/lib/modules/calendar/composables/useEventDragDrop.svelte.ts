/**
 * Event Drag & Drop + Resize Composable
 */

import type { CalendarEvent } from '../types';
import { differenceInMinutes, addMinutes, setHours, setMinutes } from 'date-fns';
import { toDate } from '../utils/event-date-helpers';
import { eventsStore } from '../stores/events.svelte';
import { updateBlock } from '$lib/data/time-blocks/service';
import { formatTime, getDayFromX, getMinutesFromY } from '../utils/drag-helpers';

export interface EventDragDropConfig {
	containerEl: HTMLElement | null;
	days: Date[];
	firstVisibleHour: number;
	lastVisibleHour: number;
	totalVisibleHours: number;
	hourHeight: number;
	snapMinutes?: number;
	minutesToPercent: (minutes: number) => number;
}

export function useEventDragDrop(getConfig: () => EventDragDropConfig) {
	let isDragging = $state(false);
	let draggedEvent = $state<CalendarEvent | null>(null);
	let dragOffsetMinutes = $state(0);
	let dragTargetDay = $state<Date | null>(null);
	let dragPreviewTop = $state(0);
	let dragPreviewHeight = $state(0);

	let isResizing = $state(false);
	let resizeEvent = $state<CalendarEvent | null>(null);
	let resizeEdge = $state<'top' | 'bottom'>('bottom');
	let resizeOriginalStart = $state<Date | null>(null);
	let resizeOriginalEnd = $state<Date | null>(null);
	let resizePreviewTop = $state(0);
	let resizePreviewHeight = $state(0);
	let resizeOffsetMinutes = $state(0);

	let hasMoved = $state(false);

	function dayFromX(clientX: number): Date | null {
		const config = getConfig();
		return getDayFromX(clientX, config.containerEl, config.days);
	}

	function minutesFromY(clientY: number): number {
		const config = getConfig();
		return getMinutesFromY(
			clientY,
			config.containerEl,
			config.totalVisibleHours,
			config.hourHeight,
			config.firstVisibleHour,
			config.snapMinutes
		);
	}

	// ========== Drag ==========

	function startDrag(event: CalendarEvent, e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();

		const config = getConfig();

		isDragging = true;
		draggedEvent = event;
		hasMoved = false;

		const start = toDate(event.startTime);
		const end = toDate(event.endTime);
		const duration = differenceInMinutes(end, start);

		const startMinutes = start.getHours() * 60 + start.getMinutes();
		dragPreviewTop = config.minutesToPercent(startMinutes);
		dragPreviewHeight = (duration / (config.totalVisibleHours * 60)) * 100;
		dragTargetDay = start;

		const clickMinutes = minutesFromY(e.clientY);
		dragOffsetMinutes = clickMinutes - startMinutes;

		document.addEventListener('pointermove', handleDragMove);
		document.addEventListener('pointerup', handleDragEnd);
	}

	function handleDragMove(e: PointerEvent) {
		if (!isDragging || !draggedEvent) return;

		const config = getConfig();
		hasMoved = true;

		const newDay = dayFromX(e.clientX);
		const newMinutes = minutesFromY(e.clientY) - dragOffsetMinutes;

		const clampedMinutes = Math.max(
			config.firstVisibleHour * 60,
			Math.min(config.lastVisibleHour * 60 - 15, newMinutes)
		);

		dragPreviewTop = config.minutesToPercent(clampedMinutes);
		if (newDay) {
			dragTargetDay = newDay;
		}
	}

	async function handleDragEnd(e: PointerEvent) {
		document.removeEventListener('pointermove', handleDragMove);
		document.removeEventListener('pointerup', handleDragEnd);

		if (!isDragging || !draggedEvent || !dragTargetDay || !hasMoved) {
			cleanupDrag();
			return;
		}

		const start = toDate(draggedEvent.startTime);
		const end = toDate(draggedEvent.endTime);
		const duration = differenceInMinutes(end, start);

		const newMinutes = minutesFromY(e.clientY) - dragOffsetMinutes;
		const clampedMinutes = Math.max(0, Math.min(24 * 60 - 15, newMinutes));
		const newHours = Math.floor(clampedMinutes / 60);
		const newMins = clampedMinutes % 60;

		let newStart = new Date(dragTargetDay);
		newStart = setHours(newStart, newHours);
		newStart = setMinutes(newStart, newMins);

		const newEnd = addMinutes(newStart, duration);

		if (eventsStore.isDraftEvent(draggedEvent.id)) {
			eventsStore.updateDraftEvent({
				startTime: newStart.toISOString(),
				endTime: newEnd.toISOString(),
			});
		} else if (draggedEvent.calendarId === '__external__') {
			// External items (tasks, timeEntries): update TimeBlock directly
			await updateBlock(draggedEvent.timeBlockId, {
				startDate: newStart.toISOString(),
				endDate: newEnd.toISOString(),
			});
		} else {
			// Native calendar events: update via eventsStore (updates both block + event)
			await eventsStore.updateEvent(draggedEvent.id, {
				startTime: newStart.toISOString(),
				endTime: newEnd.toISOString(),
			});
		}

		cleanupDrag();
	}

	function cleanupDrag() {
		isDragging = false;
		draggedEvent = null;
		dragTargetDay = null;
		hasMoved = false;
	}

	// ========== Resize ==========

	function startResize(event: CalendarEvent, edge: 'top' | 'bottom', e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();

		const config = getConfig();

		isResizing = true;
		resizeEvent = event;
		resizeEdge = edge;
		hasMoved = false;

		const start = toDate(event.startTime);
		const end = toDate(event.endTime);

		resizeOriginalStart = start;
		resizeOriginalEnd = end;

		const startMinutes = start.getHours() * 60 + start.getMinutes();
		const endMinutes = end.getHours() * 60 + end.getMinutes();
		const duration = differenceInMinutes(end, start);
		resizePreviewTop = config.minutesToPercent(startMinutes);
		resizePreviewHeight = (duration / (config.totalVisibleHours * 60)) * 100;

		const clickMinutes = minutesFromY(e.clientY);
		resizeOffsetMinutes = edge === 'top' ? clickMinutes - startMinutes : clickMinutes - endMinutes;

		document.addEventListener('pointermove', handleResizeMove);
		document.addEventListener('pointerup', handleResizeEnd);
	}

	function handleResizeMove(e: PointerEvent) {
		if (!isResizing || !resizeEvent || !resizeOriginalStart || !resizeOriginalEnd) return;

		const config = getConfig();
		hasMoved = true;

		const currentMinutes = minutesFromY(e.clientY);
		const adjustedMinutes = currentMinutes - resizeOffsetMinutes;
		const originalStartMinutes =
			resizeOriginalStart.getHours() * 60 + resizeOriginalStart.getMinutes();
		const originalEndMinutes = resizeOriginalEnd.getHours() * 60 + resizeOriginalEnd.getMinutes();

		if (resizeEdge === 'bottom') {
			const newEndMinutes = Math.max(
				originalStartMinutes + 15,
				Math.min(config.lastVisibleHour * 60, adjustedMinutes)
			);
			const newDuration = newEndMinutes - originalStartMinutes;
			resizePreviewHeight = (newDuration / (config.totalVisibleHours * 60)) * 100;
		} else {
			const newStartMinutes = Math.max(
				config.firstVisibleHour * 60,
				Math.min(originalEndMinutes - 15, adjustedMinutes)
			);
			const newDuration = originalEndMinutes - newStartMinutes;
			resizePreviewTop = config.minutesToPercent(newStartMinutes);
			resizePreviewHeight = (newDuration / (config.totalVisibleHours * 60)) * 100;
		}
	}

	async function handleResizeEnd(e: PointerEvent) {
		document.removeEventListener('pointermove', handleResizeMove);
		document.removeEventListener('pointerup', handleResizeEnd);

		if (!isResizing || !resizeEvent || !resizeOriginalStart || !resizeOriginalEnd || !hasMoved) {
			cleanupResize();
			return;
		}

		const config = getConfig();
		const currentMinutes = minutesFromY(e.clientY);
		const adjustedMinutes = currentMinutes - resizeOffsetMinutes;
		const originalStartMinutes =
			resizeOriginalStart.getHours() * 60 + resizeOriginalStart.getMinutes();
		const originalEndMinutes = resizeOriginalEnd.getHours() * 60 + resizeOriginalEnd.getMinutes();

		let newStart = resizeOriginalStart;
		let newEnd = resizeOriginalEnd;

		if (resizeEdge === 'bottom') {
			const newEndMinutes = Math.max(
				originalStartMinutes + 15,
				Math.min(config.lastVisibleHour * 60, adjustedMinutes)
			);
			const newHours = Math.floor(newEndMinutes / 60);
			const newMins = newEndMinutes % 60;
			newEnd = setHours(new Date(resizeOriginalEnd), newHours);
			newEnd = setMinutes(newEnd, newMins);
		} else {
			const newStartMinutes = Math.max(
				config.firstVisibleHour * 60,
				Math.min(originalEndMinutes - 15, adjustedMinutes)
			);
			const newHours = Math.floor(newStartMinutes / 60);
			const newMins = newStartMinutes % 60;
			newStart = setHours(new Date(resizeOriginalStart), newHours);
			newStart = setMinutes(newStart, newMins);
		}

		if (eventsStore.isDraftEvent(resizeEvent.id)) {
			eventsStore.updateDraftEvent({
				startTime: newStart.toISOString(),
				endTime: newEnd.toISOString(),
			});
		} else if (resizeEvent.calendarId === '__external__') {
			await updateBlock(resizeEvent.timeBlockId, {
				startDate: newStart.toISOString(),
				endDate: newEnd.toISOString(),
			});
		} else {
			await eventsStore.updateEvent(resizeEvent.id, {
				startTime: newStart.toISOString(),
				endTime: newEnd.toISOString(),
			});
		}

		cleanupResize();
	}

	function cleanupResize() {
		isResizing = false;
		resizeEvent = null;
		resizeOriginalStart = null;
		resizeOriginalEnd = null;
		resizeOffsetMinutes = 0;
		hasMoved = false;
	}

	function cancel() {
		if (isDragging || isResizing) {
			document.removeEventListener('pointermove', handleDragMove);
			document.removeEventListener('pointerup', handleDragEnd);
			document.removeEventListener('pointermove', handleResizeMove);
			document.removeEventListener('pointerup', handleResizeEnd);
			cleanupDrag();
			cleanupResize();
		}
	}

	function getResizePreviewTime(): string {
		if (!resizeEvent || !resizeOriginalStart || !resizeOriginalEnd) return '';

		const config = getConfig();
		const origStartMinutes = resizeOriginalStart.getHours() * 60 + resizeOriginalStart.getMinutes();
		const origEndMinutes = resizeOriginalEnd.getHours() * 60 + resizeOriginalEnd.getMinutes();

		const previewStartMinutes =
			(resizePreviewTop / 100) * config.totalVisibleHours * 60 + config.firstVisibleHour * 60;
		const previewEndMinutes =
			previewStartMinutes + (resizePreviewHeight / 100) * config.totalVisibleHours * 60;

		let startMin: number;
		let endMin: number;

		if (resizeEdge === 'top') {
			startMin = Math.round(previewStartMinutes);
			endMin = origEndMinutes;
		} else {
			startMin = origStartMinutes;
			endMin = Math.round(previewEndMinutes);
		}

		return `${formatTime(Math.floor(startMin / 60), startMin % 60)} - ${formatTime(Math.floor(endMin / 60), endMin % 60)}`;
	}

	return {
		get isDragging() {
			return isDragging;
		},
		get draggedEvent() {
			return draggedEvent;
		},
		get dragTargetDay() {
			return dragTargetDay;
		},
		get dragPreviewTop() {
			return dragPreviewTop;
		},
		get dragPreviewHeight() {
			return dragPreviewHeight;
		},
		get isResizing() {
			return isResizing;
		},
		get resizeEvent() {
			return resizeEvent;
		},
		get resizePreviewTop() {
			return resizePreviewTop;
		},
		get resizePreviewHeight() {
			return resizePreviewHeight;
		},
		get hasMoved() {
			return hasMoved;
		},
		resetHasMoved() {
			hasMoved = false;
		},
		startDrag,
		startResize,
		cancel,
		getResizePreviewTime,
	};
}
