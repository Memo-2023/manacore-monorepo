/**
 * Calendar module types for the unified Mana app.
 *
 * Time fields (startDate, endDate, allDay, recurrenceRule) live on TimeBlock.
 * LocalEvent only stores calendar-domain data + a timeBlockId reference.
 */

import type { BaseRecord } from '@mana/local-store';
import { deriveUpdatedAt } from '$lib/data/sync';
import type { VisibilityLevel } from '@mana/shared-privacy';
import type { TimeBlock, TimeBlockType } from '$lib/data/time-blocks/types';

export interface LocalCalendar extends BaseRecord {
	name: string;
	color: string;
	isDefault: boolean;
	isVisible: boolean;
	timezone: string;
}

export interface LocalEvent extends BaseRecord {
	calendarId: string;
	timeBlockId: string;
	title: string;
	description?: string | null;
	location?: string | null;
	color?: string | null;
	reminders?: unknown | null;
	tagIds?: string[];
	visibility?: VisibilityLevel;
	visibilityChangedAt?: string;
	visibilityChangedBy?: string;
	unlistedToken?: string;
	/** Local mirror of the server-side unlisted-snapshot expiry. */
	unlistedExpiresAt?: string;
}

export type CalendarViewType = 'week' | 'month' | 'agenda';

/**
 * CalendarEvent — the UI-facing type used by all calendar components.
 * Combines LocalEvent domain data with TimeBlock time data.
 */
export interface CalendarEvent {
	id: string;
	calendarId: string;
	timeBlockId: string;
	title: string;
	description: string | null;
	location: string | null;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	timezone: string | null;
	recurrenceRule: string | null;
	parentEventId: string | null;
	color: string | null;
	tagIds: string[];
	visibility: VisibilityLevel;
	/**
	 * Server-issued share token for `visibility === 'unlisted'`. Empty
	 * string for any other visibility (UI checks `event.unlistedToken`
	 * to know whether to render the share-link controls).
	 */
	unlistedToken: string;
	/** ISO expiry for the active unlisted-share, null when never expires. */
	unlistedExpiresAt: string | null;
	createdAt: string;
	updatedAt: string;
	// TimeBlock metadata (for universal calendar view)
	blockType: TimeBlockType;
	sourceModule: string;
	sourceId: string;
	icon: string | null;
	isLive: boolean;
	projectId: string | null;
	linkedBlockId: string | null;
	parentBlockId: string | null;
	recurrenceDate: string | null;
}

export interface Calendar {
	id: string;
	name: string;
	color: string;
	isDefault: boolean;
	isVisible: boolean;
	timezone: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Construct a CalendarEvent from a TimeBlock.
 * For native calendar events, also merges LocalEvent domain data.
 * For cross-module blocks (tasks, time entries), uses TimeBlock display fields.
 */
export function timeBlockToCalendarEvent(
	block: TimeBlock,
	eventData?: LocalEvent | null
): CalendarEvent {
	return {
		id: eventData?.id ?? block.sourceId,
		calendarId: eventData?.calendarId ?? '__external__',
		timeBlockId: block.id,
		title: eventData?.title ?? block.title,
		description: eventData?.description ?? block.description ?? null,
		location: eventData?.location ?? null,
		startTime: block.startDate,
		endTime: block.endDate ?? block.startDate,
		isAllDay: block.allDay,
		timezone: block.timezone,
		recurrenceRule: block.recurrenceRule,
		parentEventId: null,
		color: eventData?.color ?? block.color,
		tagIds: eventData?.tagIds ?? [],
		// Cross-module TimeBlock entries (tasks, time entries) don't
		// carry a calendar-specific visibility — they inherit 'space' so
		// they stay invisible on the website (public requires explicit opt-in).
		visibility: eventData?.visibility ?? 'space',
		unlistedToken: eventData?.unlistedToken ?? '',
		unlistedExpiresAt: eventData?.unlistedExpiresAt ?? null,
		createdAt: block.createdAt,
		updatedAt: deriveUpdatedAt(block),
		blockType: block.type,
		sourceModule: block.sourceModule,
		sourceId: block.sourceId,
		icon: block.icon,
		isLive: block.isLive,
		projectId: block.projectId,
		linkedBlockId: block.linkedBlockId,
		parentBlockId: block.parentBlockId,
		recurrenceDate: block.recurrenceDate,
	};
}
