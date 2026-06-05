<script lang="ts">
	import { getDateFnsLocale } from '$lib/i18n/format';
	import { onMount, getContext } from 'svelte';
	import { calendarViewStore } from '../stores/view.svelte';
	import { eventsStore } from '../stores/events.svelte';
	import { dropTarget } from '@mana/shared-ui/dnd';
	import type { DragPayload } from '@mana/shared-ui/dnd';
	import {
		getEventsForDay,
		getEventsInRange,
		filterEventsByVisibleCalendars,
		getCalendarColor,
		getDefaultCalendar,
	} from '../queries';
	import type { Calendar, CalendarEvent } from '../types';
	import {
		useVisibleHours,
		useCurrentTimeIndicator,
		useEventDragDrop,
		useDragToCreate,
		useCalendarKeyboard,
	} from '../composables';
	import { toDate } from '../utils/event-date-helpers';
	import { HOUR_HEIGHT_PX } from '../utils/constants';
	import EventCard from './EventCard.svelte';
	import {
		format,
		eachDayOfInterval,
		isToday,
		isSameDay,
		differenceInMinutes,
		startOfWeek,
		endOfWeek,
	} from 'date-fns';
	interface Props {
		onEventClick?: (event: CalendarEvent) => void;
		onQuickCreate?: (startTime: Date, endTime: Date, position: { x: number; y: number }) => void;
	}

	let { onEventClick, onQuickCreate }: Props = $props();

	const calendarsCtx: { readonly value: Calendar[] } = getContext('calendars');
	const eventsCtx: { readonly value: CalendarEvent[] } = getContext('calendarEvents');

	let filteredByCalendar = $derived(
		filterEventsByVisibleCalendars(eventsCtx.value, calendarsCtx.value)
	);
	let visibleEvents = $derived(
		filteredByCalendar.filter((e) => calendarViewStore.visibleBlockTypes.has(e.blockType))
	);

	/** Resolve color: calendar color for native events, block color for external items. */
	function getItemColor(event: CalendarEvent): string {
		if (event.calendarId !== '__external__') {
			return getItemColor(event);
		}
		return event.color || '#6b7280';
	}

	let viewRange = $derived({
		start: startOfWeek(calendarViewStore.currentDate, { weekStartsOn: 1 }),
		end: endOfWeek(calendarViewStore.currentDate, { weekStartsOn: 1 }),
	});

	let rangeEvents = $derived(getEventsInRange(visibleEvents, viewRange.start, viewRange.end));

	let days = $derived(eachDayOfInterval({ start: viewRange.start, end: viewRange.end }));

	const visibleHours = useVisibleHours();
	const timeIndicator = useCurrentTimeIndicator();

	let hours = $derived(visibleHours.hours);
	let firstVisibleHour = $derived(visibleHours.firstVisibleHour);
	let lastVisibleHour = $derived(visibleHours.lastVisibleHour);
	let totalVisibleHours = $derived(visibleHours.totalVisibleHours);
	const minutesToPercent = visibleHours.minutesToPercent;

	let currentTimePosition = $derived(minutesToPercent(timeIndicator.currentMinutes));

	let daysContainerEl: HTMLDivElement;
	let timeGridEl: HTMLDivElement;

	const eventDragDrop = useEventDragDrop(() => ({
		containerEl: daysContainerEl,
		days,
		firstVisibleHour,
		lastVisibleHour,
		totalVisibleHours,
		hourHeight: HOUR_HEIGHT_PX,
		minutesToPercent,
	}));

	const dragToCreate = useDragToCreate(() => ({
		containerEl: daysContainerEl,
		days,
		firstVisibleHour,
		lastVisibleHour,
		totalVisibleHours,
		hourHeight: HOUR_HEIGHT_PX,
		minutesToPercent,
		isOtherOperationActive: () => eventDragDrop.isDragging || eventDragDrop.isResizing,
		onCreateEnd: (startTime, endTime, position) => {
			if (onQuickCreate) {
				onQuickCreate(startTime, endTime, position);
			}
		},
	}));

	const keyboard = useCalendarKeyboard([
		{
			isActive: () => eventDragDrop.isDragging || eventDragDrop.isResizing,
			cancel: eventDragDrop.cancel,
		},
		{ isActive: () => dragToCreate.isCreating, cancel: dragToCreate.cancel },
	]);

	$effect(() => keyboard.setup());

	onMount(() => {
		if (!timeGridEl) return;

		const now = new Date();
		const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();
		const viewportHeight = timeGridEl.clientHeight;
		const effectiveMinutes = Math.max(0, currentMinutesFromMidnight - firstVisibleHour * 60);
		const currentTimePixels = (effectiveMinutes / 60) * HOUR_HEIGHT_PX;
		const scrollPosition = currentTimePixels - viewportHeight / 3;

		timeGridEl.scrollTo({
			top: Math.max(0, scrollPosition),
			behavior: 'instant',
		});
	});

	function getTimedEventsForDay(day: Date): CalendarEvent[] {
		const dayEvents = getEventsForDay(rangeEvents, day);
		return dayEvents.filter((e) => !e.isAllDay);
	}

	function getAllDayEventsForDay(day: Date): CalendarEvent[] {
		const dayEvents = getEventsForDay(rangeEvents, day);
		return dayEvents.filter((e) => e.isAllDay);
	}

	let hasAnyAllDayEvents = $derived(days.some((day) => getAllDayEventsForDay(day).length > 0));

	function getEventStyle(event: CalendarEvent) {
		const start = toDate(event.startTime);
		const end = toDate(event.endTime);

		const startMinutes = start.getHours() * 60 + start.getMinutes();
		const duration = differenceInMinutes(end, start);

		const top = minutesToPercent(startMinutes);
		const height = Math.max((duration / (totalVisibleHours * 60)) * 100, 2);

		return `top: ${top}%; height: ${height}%;`;
	}

	function formatEventTimeRange(event: CalendarEvent): string {
		const start = toDate(event.startTime);
		const end = toDate(event.endTime);
		return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
	}

	function handleEventClick(event: CalendarEvent, e: MouseEvent) {
		if (eventDragDrop.isDragging || eventDragDrop.isResizing || eventDragDrop.hasMoved) {
			e.preventDefault();
			e.stopPropagation();
			setTimeout(() => eventDragDrop.resetHasMoved(), 100);
			return;
		}
		onEventClick?.(event);
	}

	/** Handle cross-module drop (task onto calendar). */
	async function handleCrossModuleDrop(day: Date, payload: DragPayload) {
		const data = payload.data as Record<string, unknown>;

		if (payload.type === 'task') {
			// Schedule task on calendar
			const { tasksStore } = await import('$lib/modules/todo/stores/tasks.svelte');
			const dateStr = format(day, 'yyyy-MM-dd');
			await tasksStore.updateTask(data.id as string, {
				_scheduleStartDate: dateStr,
				_scheduleStartTime: '09:00',
			});
		}
	}

	function formatHour(hour: number): string {
		return `${hour.toString().padStart(2, '0')}:00`;
	}
</script>

<div class="week-view">
	<!-- Sticky header -->
	<div class="sticky-header">
		<!-- Day headers -->
		<div class="day-headers" role="row">
			<div class="time-gutter"></div>
			{#each days as day}
				<div
					class="day-header"
					class:today={isToday(day)}
					role="columnheader"
					aria-label={format(day, 'EEEE, d. MMMM', { locale: getDateFnsLocale() })}
				>
					<span class="day-name">{format(day, 'EEE', { locale: getDateFnsLocale() })}</span>
					<span class="day-number" class:today={isToday(day)}>{format(day, 'd')}</span>
				</div>
			{/each}
		</div>

		<!-- All-day events row -->
		{#if hasAnyAllDayEvents}
			<div class="all-day-row">
				<div class="time-gutter"></div>
				{#each days as day}
					<div class="all-day-cell">
						{#each getAllDayEventsForDay(day) as event}
							<button
								class="all-day-event"
								style="background-color: {getItemColor(event)}"
								onclick={() => onEventClick?.(event)}
								aria-label="{event.title} - Ganztägig"
							>
								{event.title}
							</button>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Time grid -->
	<div
		class="time-grid scrollbar-thin"
		bind:this={timeGridEl}
		role="grid"
		aria-label="Wochenansicht"
	>
		<!-- Time column -->
		<div class="time-column">
			{#each hours as hour}
				<div class="time-label">
					{formatHour(hour)}
				</div>
			{/each}
		</div>

		<!-- Day columns -->
		<div class="days-container" bind:this={daysContainerEl}>
			{#each days as day}
				<div
					class="day-column"
					role="application"
					class:today={isToday(day)}
					class:creating={dragToCreate.isCreating &&
						dragToCreate.createTargetDay &&
						isSameDay(day, dragToCreate.createTargetDay)}
					onpointerdown={dragToCreate.startCreate}
					use:dropTarget={{
						accepts: ['task'],
						onDrop: (p) => handleCrossModuleDrop(day, p),
					}}
				>
					{#each hours as hour}
						<div class="hour-slot" role="button" tabindex="-1"></div>
					{/each}

					<!-- Timed events -->
					{#each getTimedEventsForDay(day) as event (event.id)}
						{@const isBeingDragged =
							eventDragDrop.isDragging && eventDragDrop.draggedEvent?.id === event.id}
						{@const isBeingResized =
							eventDragDrop.isResizing && eventDragDrop.resizeEvent?.id === event.id}
						{@const isCrossDayDrag =
							isBeingDragged &&
							eventDragDrop.dragTargetDay !== null &&
							!isSameDay(day, eventDragDrop.dragTargetDay)}
						<EventCard
							{event}
							style={isBeingDragged && !isCrossDayDrag
								? `top: ${eventDragDrop.dragPreviewTop}%; height: ${eventDragDrop.dragPreviewHeight}%;`
								: isBeingResized
									? `top: ${eventDragDrop.resizePreviewTop}%; height: ${eventDragDrop.resizePreviewHeight}%;`
									: getEventStyle(event)}
							color={getItemColor(event)}
							isDragging={isBeingDragged && !isCrossDayDrag}
							isDraggingSource={isCrossDayDrag}
							isResizing={isBeingResized}
							formattedTime={isBeingResized
								? eventDragDrop.getResizePreviewTime()
								: formatEventTimeRange(event)}
							onClick={handleEventClick}
							onPointerDown={eventDragDrop.startDrag}
							onResizeStart={eventDragDrop.startResize}
						/>
					{/each}

					<!-- Drag preview for cross-day dragging -->
					{#if eventDragDrop.isDragging && eventDragDrop.draggedEvent && eventDragDrop.dragTargetDay && isSameDay(day, eventDragDrop.dragTargetDay) && !getTimedEventsForDay(day).some((e) => e.id === eventDragDrop.draggedEvent!.id)}
						<EventCard
							event={eventDragDrop.draggedEvent}
							style="top: {eventDragDrop.dragPreviewTop}%; height: {eventDragDrop.dragPreviewHeight}%;"
							color={getItemColor(eventDragDrop.draggedEvent)}
							isDragging={true}
							formattedTime={formatEventTimeRange(eventDragDrop.draggedEvent)}
						/>
					{/if}

					<!-- Create preview (drag-to-create) -->
					{#if dragToCreate.isCreating && dragToCreate.createTargetDay && isSameDay(day, dragToCreate.createTargetDay)}
						<div
							class="create-preview"
							style="top: {dragToCreate.createPreviewTop}%; height: {dragToCreate.createPreviewHeight}%; background-color: {getCalendarColor(
								calendarsCtx.value,
								getDefaultCalendar(calendarsCtx.value)?.id || ''
							)};"
						>
							<span class="preview-time">{dragToCreate.getCreatePreviewTime()}</span>
							<span class="preview-title">(Neuer Termin)</span>
						</div>
					{/if}

					<!-- Current time indicator -->
					{#if isToday(day)}
						<div class="time-indicator" style="top: {currentTimePosition}%">
							<span class="time-indicator-label">{format(timeIndicator.now, 'HH:mm')}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.week-view {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.sticky-header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: hsl(var(--color-background));
	}

	.day-headers {
		display: flex;
		border-bottom: 1px solid hsl(var(--color-border));
	}

	.time-gutter {
		width: 60px;
		flex-shrink: 0;
	}

	.day-header {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		border-left: 1px solid hsl(var(--color-border));
		transition: background-color 150ms ease;
	}

	.day-name {
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground));
		text-transform: uppercase;
	}

	.day-number {
		font-size: 1.25rem;
		font-weight: 600;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
	}

	.day-number.today {
		background: hsl(var(--color-primary));
		color: hsl(var(--color-primary-foreground));
	}

	/* All-day events row */
	.all-day-row {
		display: flex;
		border-bottom: 1px solid hsl(var(--color-border));
		min-height: 32px;
	}

	.all-day-cell {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 4px;
		border-left: 1px solid hsl(var(--color-border));
	}

	.all-day-event {
		width: 100%;
		padding: 2px 6px;
		font-size: 0.75rem;
		color: white;
		border-radius: var(--radius-sm, 4px);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		border: none;
		cursor: pointer;
		transition: opacity 0.15s ease;
		text-align: left;
	}

	.all-day-event:hover {
		opacity: 0.85;
	}

	/* Time grid */
	.time-grid {
		flex: 1;
		display: flex;
		overflow-y: auto;
	}

	.time-column {
		width: 60px;
		flex-shrink: 0;
		padding-top: 1rem;
	}

	.time-label {
		height: 60px;
		padding-right: 0.5rem;
		text-align: right;
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground));
		position: relative;
		top: 0.25em;
	}

	.days-container {
		flex: 1;
		display: flex;
		position: relative;
	}

	.day-column {
		flex: 1;
		position: relative;
		border-left: 1px solid hsl(var(--color-border));
		padding-top: 1rem;
	}

	.day-column.today {
		background: hsl(var(--color-primary) / 0.05);
	}

	.hour-slot {
		height: 60px;
		width: 100%;
		border: none;
		border-bottom: 1px solid hsl(var(--color-border) / 0.5);
		background: transparent;
		cursor: pointer;
	}

	.hour-slot:hover {
		background: hsl(var(--color-muted) / 0.3);
	}

	/* Create preview */
	.create-preview {
		position: absolute;
		left: 2px;
		right: 2px;
		padding: 2px 4px;
		border-radius: var(--radius-sm, 4px);
		text-align: left;
		z-index: 50;
		overflow: hidden;
		color: white;
		opacity: 0.85;
		border: 2px dashed rgba(255, 255, 255, 0.5);
		pointer-events: none;
	}

	.create-preview .preview-time {
		display: block;
		font-size: 0.6rem;
		opacity: 0.9;
	}

	.create-preview .preview-title {
		display: block;
		font-size: 0.7rem;
		font-weight: 500;
		opacity: 0.8;
	}

	.day-column.creating {
		cursor: ns-resize;
	}

	/* Current time indicator */
	.time-indicator {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		background: hsl(var(--color-error, 0 84% 60%));
		z-index: 2;
	}

	.time-indicator::before {
		content: '';
		position: absolute;
		left: -4px;
		top: -4px;
		width: 10px;
		height: 10px;
		background: hsl(var(--color-error, 0 84% 60%));
		border-radius: 50%;
	}

	.time-indicator-label {
		position: absolute;
		right: 4px;
		bottom: 3px;
		font-size: 0.6rem;
		font-weight: 600;
		color: hsl(var(--color-error, 0 84% 60%));
		line-height: 1;
		pointer-events: none;
	}
</style>
