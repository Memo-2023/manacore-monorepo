<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { getContext, onMount } from 'svelte';
	import { dropTarget } from '@mana/shared-ui/dnd';
	import type { DragPayload, TagDragData } from '@mana/shared-ui/dnd';
	import { useAllTags } from '@mana/shared-stores';
	import { calendarViewStore } from '$lib/modules/calendar/stores/view.svelte';
	import { eventsStore } from '$lib/modules/calendar/stores/events.svelte';
	import {
		getDefaultCalendar,
		filterEventsByVisibleCalendars,
		getCalendarColor,
	} from '$lib/modules/calendar/queries';
	import type { Calendar, CalendarEvent } from '$lib/modules/calendar/types';
	import { goto } from '$app/navigation';

	import CalendarHeader from '$lib/modules/calendar/components/CalendarHeader.svelte';
	import DateStrip from '$lib/modules/calendar/components/DateStrip.svelte';
	import WeekView from '$lib/modules/calendar/components/WeekView.svelte';
	import MonthView from '$lib/modules/calendar/components/MonthView.svelte';
	import AgendaView from '$lib/modules/calendar/components/AgendaView.svelte';
	import EventDetailModal from '$lib/modules/calendar/components/EventDetailModal.svelte';
	import EventForm from '$lib/modules/calendar/components/EventForm.svelte';
	import QuickEventPopover from '$lib/modules/calendar/components/QuickEventPopover.svelte';

	import { ShareNetwork } from '@mana/shared-icons';
	import { ShareModal } from '@mana/shared-uload';
	import { RoutePage } from '$lib/components/shell';

	const calendarsCtx: { readonly value: Calendar[] } = getContext('calendars');
	const eventsCtx: { readonly value: CalendarEvent[] } = getContext('calendarEvents');

	// ── DnD: tag support ────────────────────────────────────
	const globalTags = useAllTags();
	const tagMap = $derived(new Map((globalTags.value ?? []).map((t) => [t.id, t])));

	function getEventTags(event: CalendarEvent) {
		return (event.tagIds ?? [])
			.map((id) => tagMap.get(id))
			.filter((t): t is NonNullable<typeof t> => t != null);
	}

	function handleTagDrop(event: CalendarEvent, payload: DragPayload) {
		const tagData = payload.data as unknown as TagDragData;
		const current = event.tagIds ?? [];
		if (!current.includes(tagData.id)) {
			eventsStore.updateTagIds(event.id, [...current, tagData.id]);
		}
	}

	const tagDropCtx = getContext<{
		set: (handler: (tagId: string, payload: DragPayload) => void) => void;
		clear: () => void;
	}>('tagDropHandler');

	onMount(() => {
		tagDropCtx?.set(async (tagId: string, payload: DragPayload) => {
			const data = payload.data as { id: string };
			if (payload.type === 'event') {
				const event = eventsCtx.value.find((e) => e.id === data.id);
				if (!event) return;
				const current = event.tagIds ?? [];
				if (!current.includes(tagId)) {
					eventsStore.updateTagIds(data.id, [...current, tagId]);
				}
			}
		});
		return () => tagDropCtx?.clear();
	});

	// ── Event interactions ──────────────────────────────────
	let selectedEvent = $state<CalendarEvent | null>(null);
	let showCreateForm = $state(false);
	let createStartTime = $state<Date | null>(null);
	let createEndTime = $state<Date | null>(null);

	// Quick create popover (inline in calendar grid)
	let showQuickCreate = $state(false);
	let quickCreateStart = $state<Date>(new Date());
	let quickCreateEnd = $state<Date>(new Date());
	let quickCreatePosition = $state({ x: 0, y: 0 });

	function handleEventClick(event: CalendarEvent) {
		// Cross-module navigation: external items open in their source module
		if (event.calendarId === '__external__') {
			const routeMap: Record<string, string> = {
				todo: '/todo',
				times: '/times',
			};
			const route = routeMap[event.sourceModule];
			if (route) {
				goto(route);
				return;
			}
		}

		// Native calendar events: open detail modal
		selectedEvent = event;
	}

	function handleNewEvent() {
		createStartTime = null;
		createEndTime = null;
		showCreateForm = true;
	}

	function handleQuickCreate(startTime: Date, endTime: Date, position: { x: number; y: number }) {
		quickCreateStart = startTime;
		quickCreateEnd = endTime;
		quickCreatePosition = position;
		showQuickCreate = true;
	}

	async function handleQuickSave(data: {
		title: string;
		calendarId: string;
		startTime: string;
		endTime: string;
		isAllDay: boolean;
		location: string | null;
		description: string | null;
		recurrenceRule: string | null;
		blockType?: string;
	}) {
		if (data.blockType === 'timeEntry') {
			// Create a time entry via TimeBlock + LocalTimeEntry
			const { createBlock } = await import('$lib/data/time-blocks/service');
			const { timeEntryTable } = await import('$lib/modules/times/collections');
			const entryId = crypto.randomUUID();
			const timeBlockId = await createBlock({
				startDate: data.startTime,
				endDate: data.endTime,
				kind: 'logged',
				type: 'timeEntry',
				sourceModule: 'times',
				sourceId: entryId,
				title: data.title,
			});
			await timeEntryTable.add({
				id: entryId,
				timeBlockId,
				description: data.title,
				duration: Math.round(
					(new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 1000
				),
				isBillable: false,
				tags: [],
				visibility: 'private',
				source: { app: 'manual' },
			});
			showQuickCreate = false;
			return;
		}

		// Default: create calendar event
		eventsStore.createEvent({
			calendarId: data.calendarId,
			title: data.title,
			description: data.description,
			startTime: data.startTime,
			endTime: data.endTime,
			isAllDay: data.isAllDay,
			location: data.location,
			recurrenceRule: data.recurrenceRule,
		});
		showQuickCreate = false;
	}

	async function handleCreateSave(data: Record<string, unknown>) {
		const defaultCal = getDefaultCalendar(calendarsCtx.value);
		await eventsStore.createEvent({
			calendarId: (data.calendarId as string) || defaultCal?.id || '',
			title: data.title as string,
			description: (data.description as string) || null,
			startTime: data.startTime as string,
			endTime: data.endTime as string,
			isAllDay: data.isAllDay as boolean,
			location: (data.location as string) || null,
			recurrenceRule: (data.recurrenceRule as string) || null,
		});
		showCreateForm = false;
	}

	// Share modal
	let shareEvent = $state<CalendarEvent | null>(null);
	let shareUrl = $derived(
		shareEvent
			? `${typeof window !== 'undefined' ? window.location.origin : ''}/calendar?event=${shareEvent.id}`
			: ''
	);
</script>

<svelte:head>
	<title>{$_('calendar.detail_route.doc_title')}</title>
</svelte:head>

<RoutePage appId="calendar">
	<div class="calendar-page">
		<!-- Header -->
		<CalendarHeader onNewEvent={handleNewEvent} />

		<!-- Calendar view (full width) -->
		<div class="calendar-content">
			{#if calendarViewStore.viewType === 'week'}
				<WeekView onEventClick={handleEventClick} onQuickCreate={handleQuickCreate} />
			{:else if calendarViewStore.viewType === 'month'}
				<MonthView
					onEventClick={handleEventClick}
					onDayClick={(day) => {
						calendarViewStore.setDate(day);
						calendarViewStore.setViewType('week');
					}}
				/>
			{:else}
				<AgendaView onEventClick={handleEventClick} />
			{/if}
		</div>

		<!-- Floating Date Strip (above PillNav/InputBar) -->
		<DateStrip />
	</div>
</RoutePage>

<!-- Quick Event Popover (inline in calendar grid) -->
{#if showQuickCreate}
	<QuickEventPopover
		startTime={quickCreateStart}
		endTime={quickCreateEnd}
		position={quickCreatePosition}
		onSave={handleQuickSave}
		onClose={() => (showQuickCreate = false)}
	/>
{/if}

<!-- Event Detail Modal -->
{#if selectedEvent}
	<EventDetailModal event={selectedEvent} onClose={() => (selectedEvent = null)} />
{/if}

<!-- Create Event Modal (full form, via header button or "Weitere Optionen") -->
{#if showCreateForm}
	<div class="modal-backdrop" role="presentation">
		<div
			class="modal-backdrop-inner"
			onclick={(e) => e.target === e.currentTarget && (showCreateForm = false)}
			onkeydown={(e) => e.key === 'Escape' && (showCreateForm = false)}
			tabindex="-1"
			role="presentation"
		>
			<div class="modal-container" role="dialog" aria-modal="true">
				<h2 class="modal-title">{$_('calendar.detail_route.create_modal_title')}</h2>
				<EventForm
					mode="create"
					initialStartTime={createStartTime}
					initialEndTime={createEndTime}
					onSave={handleCreateSave}
					onCancel={() => (showCreateForm = false)}
				/>
			</div>
		</div>
	</div>
{/if}

<!-- Share Modal (uLoad integration) -->
<ShareModal
	visible={shareEvent !== null}
	onClose={() => (shareEvent = null)}
	url={shareUrl}
	title={shareEvent?.title ?? ''}
	source="calendar"
	description={shareEvent?.location ? `Ort: ${shareEvent.location}` : ''}
/>

<style>
	.calendar-page {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.calendar-content {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	/* Modal styles */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
	}

	/* Modal backdrop overlay is intentionally near-black regardless of theme */
	.modal-backdrop-inner {
		position: absolute;
		inset: 0;
		background: hsl(0 0% 0% / 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		animation: fade-in 150ms ease;
	}

	.modal-container {
		background: hsl(var(--color-card));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px hsl(0 0% 0% / 0.5);
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		padding: 1.5rem;
		animation: slide-up 200ms ease;
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--color-foreground));
		margin: 0 0 1rem;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* DnD styles */
	:global(.mana-drop-target-hover) {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: -2px;
		border-radius: 0.5rem;
		background: hsl(var(--color-primary) / 0.06) !important;
	}

	:global(.mana-drop-target-success) {
		animation: drop-success 400ms ease-out;
	}

	@keyframes drop-success {
		0% {
			outline-color: hsl(var(--color-success));
			background: hsl(var(--color-success) / 0.1);
		}
		100% {
			outline-color: transparent;
			background: transparent;
		}
	}
</style>
