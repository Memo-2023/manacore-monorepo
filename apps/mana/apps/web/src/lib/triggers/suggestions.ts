/**
 * Suggestion Engine — Discovers potential automations by matching
 * entity names across modules.
 *
 * The cross-matching rules (Events/Tasks → Habit) were removed when the
 * habits module was retired. No suggestion rules remain, so
 * generateSuggestions currently returns an empty list. The function and
 * the AutomationSuggestion type are kept for the call sites (ListView,
 * inline-suggest) and as the seam for future cross-module rules.
 */

import type { ConditionOp } from './conditions';

export interface AutomationSuggestion {
	id: string;
	name: string;
	description: string;
	sourceApp: string;
	sourceCollection: string;
	sourceOp: 'insert';
	conditionField: string;
	conditionOp: ConditionOp;
	conditionValue: string;
	targetApp: string;
	targetAction: string;
	targetParams: Record<string, string>;
}

/**
 * Generate automation suggestions by cross-matching entity names.
 * Excludes suggestions that already have a matching automation.
 *
 * No suggestion rules are currently defined (the habit-matching rules
 * were removed with the habits module), so this returns an empty list.
 */
export async function generateSuggestions(): Promise<AutomationSuggestion[]> {
	return [];
}
