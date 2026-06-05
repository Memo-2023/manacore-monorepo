/**
 * Automations module types.
 */

import type { BaseRecord } from '@mana/local-store';
import type { ConditionOp } from '$lib/triggers/conditions';

export interface LocalAutomation extends BaseRecord {
	name: string;
	enabled: boolean;
	sourceApp: string;
	sourceCollection: string;
	sourceOp: 'insert' | 'update';
	conditionField?: string;
	conditionOp?: ConditionOp;
	conditionValue?: string;
	targetApp: string;
	targetAction: string;
	targetParams?: Record<string, string>;
}

// ─── UI Metadata ─────────────────────────────────────────

export interface SourceOption {
	app: string;
	appLabel: string;
	collection: string;
	collectionLabel: string;
	fields: string[];
}

export interface ActionOption {
	app: string;
	appLabel: string;
	action: string;
	actionLabel: string;
	params: {
		key: string;
		label: string;
		type: 'text' | 'select';
		options?: { value: string; label: string }[];
	}[];
}

/** Available source apps/collections for trigger conditions. */
export const SOURCE_OPTIONS: SourceOption[] = [
	{
		app: 'calendar',
		appLabel: 'Kalender',
		collection: 'events',
		collectionLabel: 'Events',
		fields: ['title', 'description', 'location'],
	},
	{
		app: 'todo',
		appLabel: 'Todo',
		collection: 'tasks',
		collectionLabel: 'Aufgaben',
		fields: ['title', 'description'],
	},
	{
		app: 'contacts',
		appLabel: 'Kontakte',
		collection: 'contacts',
		collectionLabel: 'Kontakte',
		fields: ['firstName', 'lastName', 'company'],
	},
	{
		app: 'notes',
		appLabel: 'Notes',
		collection: 'notes',
		collectionLabel: 'Notizen',
		fields: ['title', 'content'],
	},
	{
		app: 'places',
		appLabel: 'Places',
		collection: 'places',
		collectionLabel: 'Orte',
		fields: ['name', 'address', 'category'],
	},
];

/** Available target actions. Params with type='select' get populated dynamically. */
export const ACTION_OPTIONS: ActionOption[] = [
	{
		app: 'todo',
		appLabel: 'Todo',
		action: 'createTask',
		actionLabel: 'Aufgabe erstellen',
		params: [{ key: 'title', label: 'Titel', type: 'text' }],
	},
	{
		app: 'notes',
		appLabel: 'Notes',
		action: 'createNote',
		actionLabel: 'Notiz erstellen',
		params: [{ key: 'title', label: 'Titel', type: 'text' }],
	},
];

export const CONDITION_OPS: { value: ConditionOp; label: string }[] = [
	{ value: 'contains', label: 'enthält' },
	{ value: 'equals', label: 'ist gleich' },
	{ value: 'startsWith', label: 'beginnt mit' },
	{ value: 'matches', label: 'Regex' },
];
