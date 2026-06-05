/**
 * Calendar View Store — Manages view state (current date, view type, navigation).
 */

import { browser } from '$app/environment';
import type { CalendarViewType } from '../types';
import type { TimeBlockType } from '$lib/data/time-blocks/types';
import {
	startOfDay,
	startOfWeek,
	startOfMonth,
	endOfDay,
	endOfWeek,
	endOfMonth,
	addDays,
	addWeeks,
	addMonths,
	subWeeks,
	subMonths,
} from 'date-fns';

const SUPPORTED_VIEWS: CalendarViewType[] = ['week', 'month', 'agenda'];

let currentDate = $state(new Date());
let viewType = $state<CalendarViewType>('week');
let visibleBlockTypes = $state<Set<TimeBlockType>>(
	new Set([
		'event',
		'task',
		'timeEntry',
		'focus',
		'break',
		'body',
		'watering',
		'sleep',
		'practice',
		'period',
		'guide',
		'visit',
		'study',
		'listening',
		'mood',
		'rehearsal',
	])
);

const viewRange = $derived.by(() => {
	const weekStartsOn = 1 as 0 | 1; // Monday

	switch (viewType) {
		case 'week':
			return {
				start: startOfWeek(currentDate, { weekStartsOn }),
				end: endOfWeek(currentDate, { weekStartsOn }),
			};
		case 'month':
			return {
				start: startOfMonth(currentDate),
				end: endOfMonth(currentDate),
			};
		case 'agenda':
			return {
				start: startOfDay(currentDate),
				end: endOfDay(addDays(currentDate, 30)),
			};
		default:
			return {
				start: startOfWeek(currentDate, { weekStartsOn }),
				end: endOfWeek(currentDate, { weekStartsOn }),
			};
	}
});

export const calendarViewStore = {
	get currentDate() {
		return currentDate;
	},
	get viewType() {
		return viewType;
	},
	get viewRange() {
		return viewRange;
	},
	get visibleBlockTypes() {
		return visibleBlockTypes;
	},

	initialize() {
		if (!browser) return;

		const savedView = localStorage.getItem('mana-calendar-view-type');
		if (savedView && SUPPORTED_VIEWS.includes(savedView as CalendarViewType)) {
			viewType = savedView as CalendarViewType;
		}
	},

	setDate(date: Date) {
		currentDate = date;
	},

	setViewType(type: CalendarViewType) {
		if (!SUPPORTED_VIEWS.includes(type)) {
			type = 'week';
		}
		viewType = type;
		if (browser) {
			localStorage.setItem('mana-calendar-view-type', type);
		}
	},

	toggleBlockType(type: TimeBlockType) {
		const next = new Set(visibleBlockTypes);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		visibleBlockTypes = next;
	},

	setVisibleBlockTypes(types: Set<TimeBlockType>) {
		visibleBlockTypes = types;
	},

	goToToday() {
		currentDate = new Date();
	},

	goToPrevious() {
		switch (viewType) {
			case 'week':
				currentDate = subWeeks(currentDate, 1);
				break;
			case 'month':
				currentDate = subMonths(currentDate, 1);
				break;
			case 'agenda':
				currentDate = subWeeks(currentDate, 1);
				break;
		}
	},

	goToNext() {
		switch (viewType) {
			case 'week':
				currentDate = addWeeks(currentDate, 1);
				break;
			case 'month':
				currentDate = addMonths(currentDate, 1);
				break;
			case 'agenda':
				currentDate = addWeeks(currentDate, 1);
				break;
		}
	},
};
