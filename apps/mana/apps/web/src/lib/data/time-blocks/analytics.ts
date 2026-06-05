/**
 * TimeBlock Analytics — Aggregation queries for time budget & insights.
 *
 * All functions are pure (operate on pre-fetched TimeBlock arrays).
 * Fetch blocks once with useAllTimeBlocks() or a date-range query,
 * then run analytics functions on the result.
 */

import type { TimeBlock, TimeBlockType, TimeBlockSourceModule } from './types';

// ─── Time Breakdown ──────────────────────────────────────

export interface TimeBreakdown {
	label: string;
	totalSeconds: number;
	count: number;
	percentage: number;
	color: string;
}

const TYPE_COLORS: Record<TimeBlockType, string> = {
	event: '#3b82f6',
	task: '#f59e0b',
	timeEntry: '#8b5cf6',
	focus: '#ef4444',
	break: '#6b7280',
	body: '#ef4444',
	watering: '#06b6d4',
	sleep: '#6366f1',
	practice: '#f97316',
	period: '#ec4899',
	guide: '#14b8a6',
	visit: '#a855f7',
	study: '#0ea5e9',
	listening: '#d946ef',
	mood: '#fb923c',
	rehearsal: '#84cc16',
};

const TYPE_LABELS: Record<TimeBlockType, string> = {
	event: 'Termine',
	task: 'Aufgaben',
	timeEntry: 'Zeiterfassung',
	focus: 'Fokus',
	break: 'Pausen',
	body: 'Training',
	watering: 'Gießen',
	sleep: 'Schlaf',
	practice: 'Übung',
	period: 'Periode',
	guide: 'Guides',
	visit: 'Besuche',
	study: 'Lernen',
	listening: 'Musik',
	mood: 'Stimmung',
	rehearsal: 'Probe',
};

function blockDuration(b: TimeBlock): number {
	if (!b.endDate) return 0;
	return Math.max(0, (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / 1000);
}

/** Break down time by block type. */
export function breakdownByType(blocks: TimeBlock[]): TimeBreakdown[] {
	const groups = new Map<TimeBlockType, { totalSeconds: number; count: number }>();

	for (const b of blocks) {
		const dur = blockDuration(b);
		const existing = groups.get(b.type) ?? { totalSeconds: 0, count: 0 };
		existing.totalSeconds += dur;
		existing.count++;
		groups.set(b.type, existing);
	}

	const totalAll = [...groups.values()].reduce((sum, g) => sum + g.totalSeconds, 0);

	return [...groups.entries()]
		.map(([type, data]) => ({
			label: TYPE_LABELS[type] ?? type,
			totalSeconds: data.totalSeconds,
			count: data.count,
			percentage: totalAll > 0 ? (data.totalSeconds / totalAll) * 100 : 0,
			color: TYPE_COLORS[type] ?? '#6b7280',
		}))
		.sort((a, b) => b.totalSeconds - a.totalSeconds);
}

/** Break down time by project. */
export function breakdownByProject(blocks: TimeBlock[]): TimeBreakdown[] {
	const groups = new Map<string, { totalSeconds: number; count: number; color: string }>();

	for (const b of blocks) {
		const key = b.projectId || '__none__';
		const dur = blockDuration(b);
		const existing = groups.get(key) ?? { totalSeconds: 0, count: 0, color: b.color || '#6b7280' };
		existing.totalSeconds += dur;
		existing.count++;
		groups.set(key, existing);
	}

	const totalAll = [...groups.values()].reduce((sum, g) => sum + g.totalSeconds, 0);

	return [...groups.entries()]
		.map(([key, data]) => ({
			label: key === '__none__' ? 'Kein Projekt' : key,
			totalSeconds: data.totalSeconds,
			count: data.count,
			percentage: totalAll > 0 ? (data.totalSeconds / totalAll) * 100 : 0,
			color: data.color,
		}))
		.sort((a, b) => b.totalSeconds - a.totalSeconds);
}

// ─── Daily Stats ─────────────────────────────────────────

export interface DailyStat {
	date: string; // YYYY-MM-DD
	totalSeconds: number;
	byType: Record<string, number>;
}

/** Get daily time totals for a date range. */
export function dailyStats(blocks: TimeBlock[], days: number = 7): DailyStat[] {
	const today = new Date();
	const stats = new Map<string, DailyStat>();

	// Initialize days
	for (let d = days - 1; d >= 0; d--) {
		const date = new Date(today);
		date.setDate(date.getDate() - d);
		const dateStr = date.toISOString().split('T')[0];
		stats.set(dateStr, { date: dateStr, totalSeconds: 0, byType: {} });
	}

	for (const b of blocks) {
		const dateStr = b.startDate.split('T')[0];
		const stat = stats.get(dateStr);
		if (!stat) continue;

		const dur = blockDuration(b);
		stat.totalSeconds += dur;
		stat.byType[b.type] = (stat.byType[b.type] ?? 0) + dur;
	}

	return [...stats.values()];
}

export interface HeatmapCell {
	date: string;
	count: number;
	intensity: number; // 0-4 (like GitHub contribution graph)
}

// ─── Plan vs Reality ─────────────────────────────────────

export interface PlanAdherence {
	totalScheduled: number;
	totalCompleted: number; // has linkedBlockId
	adherencePercent: number;
	averageDelayMinutes: number; // how late did logged blocks start vs planned
}

/** Calculate plan adherence stats. */
export function planAdherence(blocks: TimeBlock[]): PlanAdherence {
	const scheduled = blocks.filter((b) => b.kind === 'scheduled');
	const completed = scheduled.filter((b) => b.linkedBlockId);

	let totalDelay = 0;
	let delayCount = 0;

	for (const s of completed) {
		const logged = blocks.find((b) => b.id === s.linkedBlockId);
		if (logged) {
			const diff = (new Date(logged.startDate).getTime() - new Date(s.startDate).getTime()) / 60000;
			totalDelay += Math.abs(diff);
			delayCount++;
		}
	}

	return {
		totalScheduled: scheduled.length,
		totalCompleted: completed.length,
		adherencePercent:
			scheduled.length > 0 ? Math.round((completed.length / scheduled.length) * 100) : 0,
		averageDelayMinutes: delayCount > 0 ? Math.round(totalDelay / delayCount) : 0,
	};
}

// ─── Streaks ─────────────────────────────────────────────

/** Calculate the current productive streak (consecutive days with at least one block). */
export function productiveStreak(blocks: TimeBlock[]): number {
	const dates = new Set(blocks.map((b) => b.startDate.split('T')[0]));
	let streak = 0;
	const d = new Date();

	while (true) {
		const dateStr = d.toISOString().split('T')[0];
		if (dates.has(dateStr)) {
			streak++;
			d.setDate(d.getDate() - 1);
		} else {
			break;
		}
	}

	return streak;
}
