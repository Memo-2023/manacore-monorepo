import { describe, it, expect } from 'vitest';
import { expandRule, expandTemplatesVirtually } from './recurrence';
import type { LocalTimeBlock } from './types';

describe('recurrence engine', () => {
	describe('expandRule', () => {
		it('should expand a daily rule within a range', () => {
			const dtstart = new Date('2026-04-01T09:00:00Z');
			const rangeStart = new Date('2026-04-01T00:00:00Z');
			const rangeEnd = new Date('2026-04-05T23:59:59Z');

			const dates = expandRule('RRULE:FREQ=DAILY', dtstart, rangeStart, rangeEnd);
			expect(dates.length).toBe(5);
		});

		it('should expand a weekly rule with BYDAY', () => {
			const dtstart = new Date('2026-04-06T10:00:00Z'); // Monday
			const rangeStart = new Date('2026-04-06T00:00:00Z');
			const rangeEnd = new Date('2026-04-19T23:59:59Z'); // 2 weeks

			const dates = expandRule('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR', dtstart, rangeStart, rangeEnd);
			// 2 weeks × 3 days = 6
			expect(dates.length).toBe(6);
		});

		it('should respect COUNT limit', () => {
			const dtstart = new Date('2026-04-01T09:00:00Z');
			const rangeStart = new Date('2026-04-01T00:00:00Z');
			const rangeEnd = new Date('2026-12-31T23:59:59Z');

			const dates = expandRule('RRULE:FREQ=DAILY;COUNT=3', dtstart, rangeStart, rangeEnd);
			expect(dates.length).toBe(3);
		});

		it('should respect UNTIL limit', () => {
			const dtstart = new Date('2026-04-01T09:00:00Z');
			const rangeStart = new Date('2026-04-01T00:00:00Z');
			const rangeEnd = new Date('2026-12-31T23:59:59Z');

			const dates = expandRule(
				'RRULE:FREQ=DAILY;UNTIL=20260403T235959Z',
				dtstart,
				rangeStart,
				rangeEnd
			);
			expect(dates.length).toBe(3);
		});

		it('should handle monthly frequency', () => {
			const dtstart = new Date('2026-01-15T09:00:00Z');
			const rangeStart = new Date('2026-01-01T00:00:00Z');
			const rangeEnd = new Date('2026-06-30T23:59:59Z');

			const dates = expandRule('RRULE:FREQ=MONTHLY', dtstart, rangeStart, rangeEnd);
			expect(dates.length).toBe(6); // Jan-Jun
		});

		it('should handle interval > 1', () => {
			const dtstart = new Date('2026-04-06T09:00:00Z'); // Monday
			const rangeStart = new Date('2026-04-06T00:00:00Z');
			const rangeEnd = new Date('2026-05-03T23:59:59Z'); // 4 weeks

			const dates = expandRule('RRULE:FREQ=WEEKLY;INTERVAL=2', dtstart, rangeStart, rangeEnd);
			expect(dates.length).toBe(2); // every other week
		});
	});

	describe('expandTemplatesVirtually', () => {
		function makeTemplate(overrides: Partial<LocalTimeBlock> = {}): LocalTimeBlock {
			return {
				id: 'tmpl-1',
				startDate: '2026-04-06T09:00:00.000Z',
				endDate: '2026-04-06T10:00:00.000Z',
				allDay: false,
				isLive: false,
				kind: 'scheduled',
				type: 'event',
				sourceModule: 'calendar',
				sourceId: 'evt-1',
				title: 'Daily Standup',
				recurrenceRule: 'FREQ=DAILY',
				createdAt: '2026-04-06T00:00:00Z',
				updatedAt: '2026-04-06T00:00:00Z',
				...overrides,
			} as LocalTimeBlock;
		}

		it('should generate virtual blocks for a date range', () => {
			const templates = [makeTemplate()];
			const virtuals = expandTemplatesVirtually(
				templates,
				[],
				'2026-04-06T00:00:00Z',
				'2026-04-08T23:59:59Z'
			);

			expect(virtuals.length).toBe(3);
			expect(virtuals[0].isVirtual).toBe(true);
			expect(virtuals[0].parentBlockId).toBe('tmpl-1');
			expect(virtuals[0].title).toBe('Daily Standup');
		});

		it('should skip dates that already have materialized instances', () => {
			const templates = [makeTemplate()];
			const existing = [
				{
					...makeTemplate({ id: 'inst-1' }),
					parentBlockId: 'tmpl-1',
					recurrenceDate: '2026-04-07',
					recurrenceRule: null,
				},
			] as LocalTimeBlock[];

			const virtuals = expandTemplatesVirtually(
				templates,
				existing,
				'2026-04-06T00:00:00Z',
				'2026-04-08T23:59:59Z'
			);

			// Should skip Apr 7 since it exists
			expect(virtuals.length).toBe(2);
			expect(virtuals.map((v) => v.recurrenceDate)).not.toContain('2026-04-07');
		});

		it('should skip deleted templates', () => {
			const templates = [makeTemplate({ deletedAt: '2026-04-06T12:00:00Z' })];
			const virtuals = expandTemplatesVirtually(
				templates,
				[],
				'2026-04-06T00:00:00Z',
				'2026-04-08T23:59:59Z'
			);

			expect(virtuals.length).toBe(0);
		});

		it('should preserve template duration in virtual blocks', () => {
			const templates = [
				makeTemplate({
					startDate: '2026-04-06T14:00:00.000Z',
					endDate: '2026-04-06T15:30:00.000Z', // 90min
				}),
			];

			const virtuals = expandTemplatesVirtually(
				templates,
				[],
				'2026-04-06T00:00:00Z',
				'2026-04-06T23:59:59Z'
			);

			expect(virtuals.length).toBe(1);
			const start = new Date(virtuals[0].startDate);
			const end = new Date(virtuals[0].endDate!);
			expect(end.getTime() - start.getTime()).toBe(90 * 60 * 1000);
		});

		it('should generate synthetic IDs with __recurrence__ pattern', () => {
			const templates = [makeTemplate()];
			const virtuals = expandTemplatesVirtually(
				templates,
				[],
				'2026-04-06T00:00:00Z',
				'2026-04-06T23:59:59Z'
			);

			expect(virtuals[0].id).toMatch(/^tmpl-1__recurrence__2026-04-06$/);
		});
	});
});
