<script lang="ts">
	import ContextMenu, { type ContextMenuItem } from '../organisms/ContextMenu.svelte';
	import { getInputBarSettingsStore } from './inputBarSettings.svelte';
	import { clearRecentHistory } from './recentInputHistory';

	interface DefaultOption {
		id: string;
		label: string;
	}

	interface Props {
		visible: boolean;
		x: number;
		y: number;
		onClose: () => void;
		/** Callback when settings change (to update parent component) */
		onSettingsChange?: () => void;
		/** Callback to show keyboard shortcuts help */
		onShowShortcuts?: () => void;
		/** Callback to show syntax help */
		onShowSyntaxHelp?: () => void;
		/** App-specific default options (e.g., calendars for calendar app) */
		defaultOptions?: DefaultOption[];
		/** Currently selected default option ID */
		selectedDefaultId?: string;
		/** Label for the default option (e.g., "Standard-Kalender") */
		defaultOptionLabel?: string;
		/** Callback when default option changes */
		onDefaultChange?: (id: string) => void;
	}

	let {
		visible,
		x,
		y,
		onClose,
		onSettingsChange,
		onShowShortcuts,
		onShowSyntaxHelp,
		defaultOptions = [],
		selectedDefaultId,
		defaultOptionLabel = 'Standard',
		onDefaultChange,
	}: Props = $props();

	// Get settings store
	const settingsStore = getInputBarSettingsStore();

	// Toggle handlers
	function toggleSyntaxHighlighting() {
		settingsStore.toggle('syntaxHighlighting');
		onSettingsChange?.();
	}

	function toggleAutoFocus() {
		settingsStore.toggle('autoFocus');
		onSettingsChange?.();
	}

	function handleClearHistory() {
		clearRecentHistory();
		onSettingsChange?.();
	}

	function handleDefaultChange(id: string) {
		onDefaultChange?.(id);
	}

	// Build menu items dynamically
	let menuItems = $derived.by((): ContextMenuItem[] => {
		const items: ContextMenuItem[] = [];

		// === Appearance Settings ===
		items.push({
			id: 'syntax-highlighting',
			label: 'Syntax Highlighting',
			iconName: 'edit',
			toggle: true,
			checked: settingsStore.syntaxHighlighting,
			action: toggleSyntaxHighlighting,
		});

		items.push({
			id: 'auto-focus',
			label: 'Auto-Focus',
			iconName: 'eye',
			toggle: true,
			checked: settingsStore.autoFocus,
			action: toggleAutoFocus,
		});

		// === App-specific Default Option ===
		if (defaultOptions.length > 0 && onDefaultChange) {
			items.push({
				id: 'divider-defaults',
				label: '',
				type: 'divider',
			});

			// Show current selection with submenu-like display
			const selectedOption = defaultOptions.find((o) => o.id === selectedDefaultId);
			items.push({
				id: 'default-option-header',
				label: defaultOptionLabel,
				iconName: 'calendar',
				disabled: true,
			});

			// Show options as selectable items
			defaultOptions.forEach((option) => {
				items.push({
					id: `default-${option.id}`,
					label: option.label,
					toggle: true,
					checked: option.id === selectedDefaultId,
					action: () => handleDefaultChange(option.id),
				});
			});
		}

		// === History ===
		items.push({
			id: 'divider-history',
			label: '',
			type: 'divider',
		});

		items.push({
			id: 'clear-history',
			label: 'Verlauf löschen',
			iconName: 'trash',
			variant: 'danger',
			action: handleClearHistory,
		});

		// === Help ===
		items.push({
			id: 'divider-help',
			label: '',
			type: 'divider',
		});

		if (onShowShortcuts) {
			items.push({
				id: 'shortcuts',
				label: 'Tastenkürzel',
				iconName: 'gear',
				shortcut: '?',
				action: onShowShortcuts,
			});
		}

		if (onShowSyntaxHelp) {
			items.push({
				id: 'syntax-help',
				label: 'Syntax-Hilfe',
				iconName: 'info',
				action: onShowSyntaxHelp,
			});
		}

		return items;
	});
</script>

<ContextMenu {visible} {x} {y} items={menuItems} {onClose} />
