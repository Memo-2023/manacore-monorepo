/**
 * Quick-Input — locale-aware Such-/Command-Eingabe-Helfer.
 *
 * Diese Subpfad-Datei enthält **noch nicht** die `InputBar`-Komponente
 * (alias `QuickInputBar`) — sie steht aussen vor, bis der Sprint 7+8
 * laut PORTING_PLAN.md abgeschlossen ist. Die TS-Helper hier sind
 * portiert (highlight-Patterns, recent-Input-History, InputBar-Settings,
 * Types), damit Apps die Sprachlogik bereits verwenden können.
 */

export type { QuickInputItem, QuickAction, CreatePreview, HighlightPattern } from './types';
export { getHighlightPatterns, highlightText } from './highlightPatterns';
export {
	getRecentTags,
	getRecentReferences,
	addRecentTag,
	addRecentReference,
	extractAndSaveFromInput,
	clearRecentHistory,
	createRecentInputHistoryStore,
} from './recentInputHistory';
export {
	loadInputBarSettings,
	saveInputBarSettings,
	updateInputBarSetting,
	resetInputBarSettings,
	createInputBarSettingsStore,
	getInputBarSettingsStore,
} from './inputBarSettings.svelte';
export type { InputBarSettings } from './inputBarSettings.svelte';

/** Default debounce timeout for search inputs (ms). */
export const SEARCH_DEBOUNCE_MS = 150;

// Komponenten
export { default as InputBar } from './InputBar.svelte';
// Alias für Backwards-Compat zu v0.1.x
export { default as QuickInputBar } from './InputBar.svelte';
export { default as InputBarContextMenu } from './InputBarContextMenu.svelte';
