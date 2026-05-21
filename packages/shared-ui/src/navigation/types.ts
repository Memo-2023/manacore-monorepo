/**
 * Shared navigation types — re-export from individual components +
 * extras for PillNavigation / GlobalSpotlight that don't yet have a
 * portable Svelte component.
 */

import type { PillDropdownItem } from './PillDropdown.svelte';

export type { PillDropdownItem };
export type { PillTabOption } from './PillTabGroup.svelte';

export interface PillNavItem {
	label: string;
	href: string;
	/** Inline SVG path string (16×16 viewBox). */
	iconSvg?: string;
	/** v0.1.x-Compat: Icon-Namen-String oder 'mana'. Wird intern auf iconSvg gemappt wo möglich. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon?: any;
	onClick?: () => void;
	active?: boolean;
	onContextMenu?: (e: MouseEvent) => void;
	iconOnly?: boolean;
}

/** Config passed when a PillNavigation dropdown should surface as a bar
 *  in the host's bottom stack instead of an in-place popover. */
export interface PillBarConfig {
	id: string;
	label: string;
	iconSvg?: string;
	/** v0.1.x-Compat: Icon-Namen-String. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon?: any;
	items: PillDropdownItem[];
	progress?: number;
}

export interface PillAppItem {
	id: string;
	name: string;
	url: string;
	icon?: string;
	color?: string;
	isCurrent?: boolean;
}

export interface PillDivider {
	type: 'divider';
}

export interface PillTagItem {
	id: string;
	name: string;
	color: string;
}

export interface PillTagSelectorConfig {
	type: 'tag-selector';
	tags: PillTagItem[];
	selectedIds: string[];
	onToggle: (tagId: string) => void;
	onClear: () => void;
	onCreate?: () => void;
	loading?: boolean;
	label?: string;
}

export interface PillTabGroupConfig {
	type: 'tabs';
	options: import('./PillTabGroup.svelte').PillTabOption[];
	value: string;
	onChange: (id: string) => void;
	sectionLabel?: string;
	onContextMenu?: (x: number, y: number) => void;
}

/** Union type for all elements that can appear in PillNavigation */
export type PillNavElement = PillNavItem | PillTabGroupConfig | PillDivider | PillTagSelectorConfig;

// ============ Global Spotlight Types ============

export interface SpotlightAction {
	id: string;
	label: string;
	description?: string;
	iconSvg?: string;
	/** v0.1.x-Compat: Phosphor-Component oder Icon-Namen. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon?: any;
	shortcut?: string;
	category?: string;
	onExecute: () => void;
}

export interface ContentSearchResult {
	id: string;
	type: string;
	appId: string;
	title: string;
	subtitle?: string;
	appIcon?: string;
	appColor?: string;
	href: string;
	score: number;
	matchedField?: string;
}

export interface ContentSearchGroup {
	appId: string;
	appName: string;
	appIcon?: string;
	appColor?: string;
	results: ContentSearchResult[];
}

export type ContentSearcher = (query: string, signal: AbortSignal) => Promise<ContentSearchGroup[]>;

// ============ Keyboard Shortcuts ============

export interface KeyboardShortcut {
	keys: string[];
	label: string;
	category?: string;
}
