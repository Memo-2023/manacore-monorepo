/**
 * Core sync configs — cross-cutting tables that don't belong to any product
 * module. These are split into four sync apps because they each push/pull on
 * their own /sync/{appId} channel:
 *
 * - mana       → user settings, dashboard config, automations
 * - tags       → globalTags, tagGroups (shared across all modules)
 * - links      → manaLinks (cross-app record links)
 * - timeblocks → unified time model (events/timeEntries/tasks all
 *                project into timeBlocks for cross-module scheduling)
 */

import type { ModuleConfig } from '$lib/data/module-registry';

export const manaCoreConfig: ModuleConfig = {
	appId: 'mana',
	tables: [
		{ name: 'userSettings' },
		{ name: 'dashboardConfigs' },
		{ name: 'workbenchScenes' },
		{ name: 'automations' },
	],
};

export const tagsCoreConfig: ModuleConfig = {
	appId: 'tags',
	tables: [
		{ name: 'globalTags', syncName: 'tags' },
		// `tagGroups` is the same on both sides — no rename needed.
		{ name: 'tagGroups' },
	],
};

export const linksCoreConfig: ModuleConfig = {
	appId: 'links',
	tables: [{ name: 'manaLinks', syncName: 'links' }],
};

export const timeblocksCoreConfig: ModuleConfig = {
	appId: 'timeblocks',
	tables: [{ name: 'timeBlocks' }, { name: 'timeBlockTags' }],
};
