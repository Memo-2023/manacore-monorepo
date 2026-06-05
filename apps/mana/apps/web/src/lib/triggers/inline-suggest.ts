/**
 * Inline Suggestion — Checks if a newly created record matches
 * a known entity in another module and suggests an automation.
 *
 * Called from Dexie hooks. Emits a CustomEvent that the UI catches.
 */

import type { AutomationSuggestion } from './suggestions';

const DISMISSED_KEY = 'mana:dismissed-suggestions';

function getDismissed(): Set<string> {
	try {
		return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'));
	} catch {
		return new Set();
	}
}

export function dismissSuggestion(id: string): void {
	const dismissed = getDismissed();
	dismissed.add(id);
	localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

export function isSuggestionDismissed(id: string): boolean {
	return getDismissed().has(id);
}

/**
 * Check if a newly created record should trigger an inline suggestion.
 * Returns null if no match or suggestion already dismissed/automated.
 *
 * The only cross-module inline suggestion (Calendar/Todo → Habit) was
 * removed when the habits module was retired. The hook in database.ts
 * still calls this for every insert, so the signature is kept intact;
 * it currently has no matching rules and always returns null.
 */
export async function checkInlineSuggestion(
	_appId: string,
	_collection: string,
	_data: Record<string, unknown>
): Promise<AutomationSuggestion | null> {
	return null;
}
