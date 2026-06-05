/**
 * Mana App — Local-First Data Layer
 *
 * Provides typed collection accessors on the unified DB for core Mana data.
 * Uses the unified `mana` Dexie database (not a separate per-app DB).
 *
 * Collections: userSettings, dashboardConfigs
 * Tags use the shared tagLocalStore from @mana/shared-stores.
 */

import type { BaseRecord } from '@mana/local-store';
import type { WidgetConfig } from '$lib/types/dashboard';
import type { TileNode } from '$lib/types/tiling';
import { db } from './database';
import { guestSettings, guestDashboardConfigs } from './guest-seed.js';
import { seedAllGuestData } from './seed-registry';

// ─── Types ──────────────────────────────────────────────────

export interface LocalUserSettings extends BaseRecord {
	/** Settings scope: 'global' for cross-app, or an appId for per-app overrides. */
	key: string;
	theme?: string;
	themeVariant?: string;
	language?: string;
	pinnedThemes?: string[];
	hiddenNavItems?: Record<string, boolean>;
	/** Catch-all for future settings fields. */
	extra?: Record<string, unknown>;
}

export interface LocalDashboardConfig extends BaseRecord {
	widgets: WidgetConfig[];
	gridColumns: number;
	lastModified: string;
	/** Tiling layout tree (binary tree of splits and leaves). */
	tiling?: TileNode;
}

// ─── Collection Wrappers ────────────────────────────────────
// Wraps Dexie tables with a LocalCollection-compatible API so existing
// consumers (queries.ts, dashboard.svelte.ts, tiling.svelte.ts) work unchanged.

function createCollectionWrapper<T extends BaseRecord>(tableName: string) {
	const table = db.table<T>(tableName);

	return {
		async get(id: string): Promise<T | undefined> {
			const record = await table.get(id);
			if (record && (record as any).deletedAt) return undefined;
			return record;
		},

		async getAll(
			_filter?: unknown,
			options?: { sortBy?: string; sortDirection?: 'asc' | 'desc' }
		): Promise<T[]> {
			let results = await table.toArray();
			results = results.filter((r) => !(r as any).deletedAt);
			if (options?.sortBy) {
				const key = options.sortBy as keyof T;
				const dir = options.sortDirection === 'desc' ? -1 : 1;
				results.sort((a, b) => {
					const aVal = String(a[key] ?? '');
					const bVal = String(b[key] ?? '');
					return aVal.localeCompare(bVal) * dir;
				});
			}
			return results;
		},

		async insert(record: T): Promise<void> {
			const now = new Date().toISOString();
			await table.put({
				...record,
				createdAt: record.createdAt ?? now,
			});
		},

		async update(id: string, changes: Partial<T>): Promise<void> {
			await table.update(id, {
				...changes,
			} as any);
		},

		async delete(id: string): Promise<void> {
			await table.update(id, {
				deletedAt: new Date().toISOString(),
			} as any);
		},

		async count(): Promise<number> {
			const all = await table.toArray();
			return all.filter((r) => !(r as any).deletedAt).length;
		},
	};
}

export const settingsCollection = createCollectionWrapper<LocalUserSettings>('userSettings');
export const dashboardCollection =
	createCollectionWrapper<LocalDashboardConfig>('dashboardConfigs');

// ─── Store-compatible facade ────────────────────────────────
// Provides initialize() / startSync() / stopSync() so the layout
// can call manaStore.initialize() without breaking.

let _initialized = false;

export const manaStore = {
	async initialize(): Promise<void> {
		if (_initialized) return;
		_initialized = true;

		// Seed guest data if tables are empty
		const settingsCount = await db.table('userSettings').count();
		if (settingsCount === 0 && guestSettings.length > 0) {
			await db.table('userSettings').bulkPut(guestSettings);
		}

		const dashboardCount = await db.table('dashboardConfigs').count();
		if (dashboardCount === 0 && guestDashboardConfigs.length > 0) {
			await db.table('dashboardConfigs').bulkPut(guestDashboardConfigs);
		}

		// Seed per-module guest data (body exercises, dream
		// examples, etc.). Idempotent: only inserts into empty tables.
		await seedAllGuestData();
	},

	// No-ops — sync is handled by the unified sync engine
	startSync(_getToken: () => Promise<string | null>): void {},
	stopSync(): void {},
};
