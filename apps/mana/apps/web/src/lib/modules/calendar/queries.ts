/**
 * Reactive Queries & Pure Helpers for Calendar module.
 *
 * The calendar is now a universal time view: it queries timeBlocks (which contain
 * events, tasks, time entries) and joins with LocalEvent for native
 * calendar events.
 *
 * Uses Dexie liveQuery to automatically re-render when IndexedDB changes
 * (local writes, sync updates, other tabs). Components call these hooks
 * at init time; no manual fetch/refresh needed.
 */

import { useScopedLiveQuery } from '$lib/data/scope/use-scoped-live-query.svelte';
import { deriveUpdatedAt } from '$lib/data/sync';
import { db } from '$lib/data/database';
import { scopedForModule, applyVisibility } from '$lib/data/scope';
import { decryptRecords } from '$lib/data/crypto';
import { filterBySceneScopeBatch } from '$lib/stores/scene-scope.svelte';
import { eventTagOps } from './stores/tags.svelte';
import type { LocalCalendar, LocalEvent, Calendar, CalendarEvent } from './types';
import { timeBlockToCalendarEvent } from './types';
import type { LocalTimeBlock } from '$lib/data/time-blocks/types';
import { toTimeBlock } from '$lib/data/time-blocks/queries';
import { isSameDay, isWithinInterval } from 'date-fns';

// ─── Type Converters ───────────────────────────────────────

export function toCalendar(local: LocalCalendar): Calendar {
	return {
		id: local.id,
		name: local.name,
		color: local.color,
		isDefault: local.isDefault,
		isVisible: local.isVisible,
		timezone: local.timezone,
		createdAt: local.createdAt ?? new Date().toISOString(),
		updatedAt: deriveUpdatedAt(local),
	};
}

// ─── Svelte 5 Reactive Hooks (call during component init) ──

/** All calendars, auto-updates on any change. */
export function useAllCalendars() {
	return useScopedLiveQuery(async () => {
		const locals = await scopedForModule<LocalCalendar, string>('calendar', 'calendars').toArray();
		const visible = applyVisibility(locals).filter((c) => !c.deletedAt);
		return visible.map(toCalendar);
	}, [] as Calendar[]);
}

/**
 * All calendar items (universal view) — queries timeBlocks and joins
 * with LocalEvent for native calendar events. Auto-updates on change.
 */
export function useAllCalendarItems() {
	return useScopedLiveQuery(async () => {
		// Fetch all non-deleted timeBlocks (filter on plaintext deletedAt
		// before paying the per-row decrypt cost). Scope filter narrows to
		// the active space + visibility filter drops records the user isn't
		// allowed to see inside a shared space.
		const blocks = await scopedForModule<LocalTimeBlock, string>(
			'calendar',
			'timeBlocks'
		).toArray();
		const visibleBlocks = applyVisibility(blocks).filter((b) => !b.deletedAt);
		const decryptedBlocks = await decryptRecords('timeBlocks', visibleBlocks);

		// Fetch all non-deleted events for joining with calendar-type blocks
		const events = await scopedForModule<LocalEvent, string>('calendar', 'events').toArray();
		const visibleEvents = applyVisibility(events).filter((e) => !e.deletedAt);
		const decryptedEvents = await decryptRecords('events', visibleEvents);
		const eventsById = new Map<string, LocalEvent>();
		for (const e of decryptedEvents) {
			eventsById.set(e.id, e);
		}

		// Scene scope filter: batch-fetch event tags for calendar-sourced blocks.
		const calendarSourceIds = decryptedBlocks
			.filter((b) => b.sourceModule === 'calendar' && b.sourceId)
			.map((b) => b.sourceId);
		const tagMap = await eventTagOps.getTagIdsForMany(calendarSourceIds);
		const scopedBlocks = filterBySceneScopeBatch(decryptedBlocks, (b) => b.sourceId ?? '', tagMap);

		// Convert to CalendarEvent, joining event data for calendar blocks
		return scopedBlocks.map((block) => {
			const tb = toTimeBlock(block);
			const eventData =
				block.sourceModule === 'calendar' ? (eventsById.get(block.sourceId) ?? null) : null;
			return timeBlockToCalendarEvent(tb, eventData);
		});
	}, [] as CalendarEvent[]);
}

// ─── Pure Calendar Helpers ─────────────────────────────────

/** Get visible calendars (where isVisible is true). */
export function getVisibleCalendars(calendars: Calendar[]): Calendar[] {
	return calendars.filter((c) => c.isVisible);
}

/** Get the default calendar, falling back to the first calendar. */
export function getDefaultCalendar(calendars: Calendar[]): Calendar | null {
	return calendars.find((c) => c.isDefault) || calendars[0] || null;
}

/** Get a calendar by ID. */
export function getCalendarById(calendars: Calendar[], id: string): Calendar | undefined {
	return calendars.find((c) => c.id === id);
}

/** Get a calendar's color by ID, with fallback. */
export function getCalendarColor(calendars: Calendar[], id: string): string {
	const calendar = calendars.find((c) => c.id === id);
	return calendar?.color || '#3b82f6';
}

// ─── Pure Event Helpers ────────────────────────────────────

/** Get an event by ID. */
export function getEventById(events: CalendarEvent[], id: string): CalendarEvent | undefined {
	return events.find((e) => e.id === id);
}

/** Convert a date string or Date to a Date. */
function toDate(dateStr: string | Date): Date {
	return typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
}

/**
 * Get events for a specific day.
 */
export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
	return events.filter((event) => {
		const eventStart = toDate(event.startTime);
		const eventEnd = toDate(event.endTime);

		if (event.isAllDay) {
			return (
				isWithinInterval(date, { start: eventStart, end: eventEnd }) || isSameDay(date, eventStart)
			);
		}

		return isSameDay(date, eventStart);
	});
}

/**
 * Get events within a time range.
 */
export function getEventsInRange(events: CalendarEvent[], start: Date, end: Date): CalendarEvent[] {
	return events.filter((event) => {
		const eventStart = toDate(event.startTime);
		const eventEnd = toDate(event.endTime);
		return eventStart <= end && eventEnd >= start;
	});
}

/**
 * Filter events by visible calendars.
 * External (non-calendar) items pass through the filter.
 */
export function filterEventsByVisibleCalendars(
	events: CalendarEvent[],
	calendars: Calendar[]
): CalendarEvent[] {
	const visibleIds = new Set(calendars.filter((c) => c.isVisible).map((c) => c.id));
	return events.filter((e) => e.calendarId === '__external__' || visibleIds.has(e.calendarId));
}

/**
 * Sort events by start time.
 */
export function sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
	return [...events].sort(
		(a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
	);
}
