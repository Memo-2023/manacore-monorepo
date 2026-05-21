<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { QuickInputItem, CreatePreview } from './types';
	import InputBarContextMenu from './InputBarContextMenu.svelte';
	import { getInputBarSettingsStore } from './inputBarSettings.svelte';
	import { getHighlightPatterns, highlightText } from './highlightPatterns';
	import { SEARCH_DEBOUNCE_MS } from './index';
	import type { HighlightPattern } from './types';

	// Settings store
	const settingsStore = getInputBarSettingsStore();

	interface DefaultOption {
		id: string;
		label: string;
	}

	import type { Snippet } from 'svelte';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	interface Props {
		onSearch: (query: string) => Promise<QuickInputItem[]>;
		onSelect: (item: QuickInputItem) => void;
		onParseCreate?: (query: string) => CreatePreview | null;
		onCreate?: (query: string) => Promise<void>;
		onSearchChange?: (query: string, results: QuickInputItem[]) => void;
		placeholder?: string;
		emptyText?: string;
		searchingText?: string;
		searchText?: string;
		createText?: string;
		appIcon?: string;
		/** Bottom offset from viewport bottom (default: '70px') */
		bottomOffset?: string;
		/** Whether to leave space for a FAB button on the right side on mobile (default: false) */
		hasFabRight?: boolean;
		/** Whether to leave space for a FAB button on the left side on mobile (default: false) */
		hasFabLeft?: boolean;
		/** Enable context menu on right-click (default: true) */
		enableContextMenu?: boolean;
		/** Defer search until explicitly triggered (default: false). Shows create + search options instead of auto-searching. */
		deferSearch?: boolean;
		/** App-specific default options for context menu (e.g., calendars) */
		defaultOptions?: DefaultOption[];
		/** Currently selected default option ID */
		selectedDefaultId?: string;
		/** Label for the default option selector (e.g., "Standard-Kalender") */
		defaultOptionLabel?: string;
		/** Callback when default option changes */
		onDefaultChange?: (id: string) => void;
		/** Callback to show keyboard shortcuts help */
		onShowShortcuts?: () => void;
		/** Callback to show syntax help */
		onShowSyntaxHelp?: () => void;
		/** Snippet for left action button (e.g., voice input) - rendered inside the input bar on the left */
		leftAction?: Snippet;
		/** Snippet for right action button (e.g., nav toggle) - rendered inside the input bar on the right */
		rightAction?: Snippet;
		/** Custom highlight patterns. If not provided, uses locale-based defaults. */
		highlightPatterns?: HighlightPattern[];
		/** Locale for syntax highlighting keywords (e.g., 'de', 'en'). Default: 'de'. */
		locale?: string;
		/** Use 'static' when inside a flex container (bottom-stack pattern). Default: 'fixed'. */
		positioning?: 'fixed' | 'static';
		/** Externally injected text (e.g. from voice input). When this changes
		 *  to a non-empty string, the input bar's query is set and focused. */
		injectedText?: string;
	}

	let {
		onSearch,
		onSelect,
		onParseCreate,
		onCreate,
		onSearchChange,
		placeholder = 'Suchen oder erstellen...',
		emptyText = 'Keine Ergebnisse gefunden',
		searchingText = 'Suche...',
		searchText = 'Suchen',
		createText = 'Erstellen',
		appIcon = 'search',
		bottomOffset = '70px',
		hasFabRight = false,
		hasFabLeft = false,
		enableContextMenu = true,
		deferSearch = false,
		defaultOptions = [],
		selectedDefaultId,
		defaultOptionLabel = 'Standard-Kalender',
		onDefaultChange,
		onShowShortcuts,
		onShowSyntaxHelp,
		leftAction,
		rightAction,
		highlightPatterns,
		locale = 'de',
		positioning = 'fixed',
		injectedText,
	}: Props = $props();

	// Use settings for autoFocus
	let effectiveAutoFocus = $derived(settingsStore.autoFocus);

	let searchQuery = $state('');
	let results = $state<QuickInputItem[]>([]);
	let loading = $state(false);
	let creating = $state(false);
	let createSuccess = $state(false);
	let selectedIndex = $state(0);
	let showPanel = $state(false);
	let isFocused = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout>;
	let createSuccessTimeout: ReturnType<typeof setTimeout>;
	let inputElement = $state<HTMLInputElement | null>(null);
	// Whether search has been explicitly triggered in deferred mode
	let searchTriggered = $state(false);

	// External text injection (e.g. from voice-to-text). When the prop
	// changes to a new non-empty value, set the search query and focus.
	let lastInjected = '';
	$effect(() => {
		if (injectedText && injectedText !== lastInjected) {
			lastInjected = injectedText;
			searchQuery = injectedText;
			// Focus the input so the user sees and can edit the text
			requestAnimationFrame(() => inputElement?.focus());
		}
	});

	// Context menu state
	let contextMenuVisible = $state(false);
	let contextMenuX = $state(0);
	let contextMenuY = $state(0);

	// Computed create preview
	let createPreview = $derived(
		searchQuery.trim() && onParseCreate ? onParseCreate(searchQuery) : null
	);

	// Resolve highlight patterns: custom prop > locale-based defaults
	let effectivePatterns = $derived(highlightPatterns ?? getHighlightPatterns(locale));

	// Highlighted text for overlay (respects syntax highlighting setting)
	let highlightedQuery = $derived(
		settingsStore.syntaxHighlighting ? highlightText(searchQuery, effectivePatterns) : searchQuery
	);

	// Check if create option is selected (it's always first when available)
	let isCreateSelected = $derived(selectedIndex === 0 && createPreview !== null);

	// In deferred mode: search option index is right after create (or 0 if no create)
	let searchOptionIndex = $derived(createPreview !== null ? 1 : 0);
	let isSearchSelected = $derived(
		deferSearch && !searchTriggered && selectedIndex === searchOptionIndex
	);

	// Show panel only when there's actual input
	$effect(() => {
		showPanel = isFocused && searchQuery.trim().length > 0;
	});

	// Auto-focus on mount (respects autoFocus setting)
	onMount(() => {
		if (effectiveAutoFocus) {
			setTimeout(() => inputElement?.focus(), 100);
		}
	});

	// Listen for external quick-input-set events (e.g., from empty state examples)
	$effect(() => {
		const handler = (e: Event) => {
			const customEvent = e as CustomEvent<{ text: string }>;
			if (customEvent.detail?.text) {
				searchQuery = customEvent.detail.text;
				// Trigger search for the new text
				handleSearch();
				// Focus the input after a short delay
				setTimeout(() => inputElement?.focus(), 50);
			}
		};

		window.addEventListener('quick-input-set', handler);

		return () => {
			window.removeEventListener('quick-input-set', handler);
		};
	});

	// Handler for settings changes (to trigger re-render)
	function handleSettingsChange() {
		// Force reactivity update by accessing the store
		settingsStore.refresh();
	}

	function handleInput() {
		if (deferSearch) {
			// In deferred mode: reset search state on new input, don't auto-search
			searchTriggered = false;
			results = [];
			loading = false;
			selectedIndex = 0;
		} else {
			handleSearch();
		}
	}

	async function handleSearch() {
		clearTimeout(searchTimeout);

		if (!searchQuery.trim()) {
			results = [];
			loading = false;
			onSearchChange?.('', []);
			return;
		}

		loading = true;

		searchTimeout = setTimeout(async () => {
			try {
				results = await onSearch(searchQuery);
				selectedIndex = 0;
				onSearchChange?.(searchQuery, results);
			} catch (e) {
				console.error('Search error:', e);
				results = [];
				onSearchChange?.(searchQuery, []);
			} finally {
				loading = false;
			}
		}, SEARCH_DEBOUNCE_MS);
	}

	async function triggerDeferredSearch() {
		if (!searchQuery.trim()) return;
		searchTriggered = true;
		await handleSearch();
	}

	async function handleCreate() {
		if (!onCreate || !searchQuery.trim() || creating) return;

		creating = true;
		try {
			await onCreate(searchQuery);
			searchQuery = '';
			results = [];
			selectedIndex = 0;
			searchTriggered = false;
			onSearchChange?.('', []);

			// Show success feedback
			creating = false;
			createSuccess = true;
			clearTimeout(createSuccessTimeout);
			createSuccessTimeout = setTimeout(() => {
				createSuccess = false;
			}, 1200);

			// Keep focus for rapid entry
			inputElement?.focus();
		} catch (error) {
			console.error('Create error:', error);
			creating = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			searchQuery = '';
			results = [];
			searchTriggered = false;
			onSearchChange?.('', []);
			inputElement?.blur();
			return;
		}

		// Cmd/Ctrl+Enter to create directly
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			if (onCreate && searchQuery.trim()) {
				handleCreate();
			}
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			const hasCreate = createPreview !== null;
			// In deferred mode before search: options are create + search
			if (deferSearch && !searchTriggered) {
				const maxIndex = hasCreate ? 1 : 0;
				selectedIndex = Math.min(selectedIndex + 1, maxIndex);
			} else {
				const maxIndex = (hasCreate ? 1 : 0) + results.length - 1;
				selectedIndex = Math.min(selectedIndex + 1, Math.max(0, maxIndex));
			}
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			if (searchQuery.trim()) {
				// If search option is selected in deferred mode
				if (isSearchSelected) {
					triggerDeferredSearch();
					return;
				}
				// If create option is selected
				if (isCreateSelected && onCreate) {
					handleCreate();
				} else if (results.length > 0) {
					// Adjust index for results (subtract 1 if create option exists)
					const resultIndex = createPreview !== null ? selectedIndex - 1 : selectedIndex;
					if (resultIndex >= 0 && resultIndex < results.length) {
						selectItem(results[resultIndex]);
					}
				}
			}
			return;
		}
	}

	function selectItem(item: QuickInputItem) {
		onSelect(item);
		searchQuery = '';
		results = [];
		onSearchChange?.('', []);
		inputElement?.blur();
	}

	function getInitials(item: QuickInputItem): string {
		const parts = item.title.split(' ');
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return item.title.substring(0, 2).toUpperCase();
	}

	function handleFocus() {
		isFocused = true;
	}

	function handleBlur(event: FocusEvent) {
		// Check if the new focus target is within our component
		const relatedTarget = event.relatedTarget as HTMLElement | null;
		const container = (event.currentTarget as HTMLElement)?.closest('.quick-input-bar');
		if (container && relatedTarget && container.contains(relatedTarget)) {
			return; // Don't close if clicking within the component
		}

		// Delay blur to allow click events to fire
		setTimeout(() => {
			isFocused = false;
		}, 150);
	}

	// Context menu handlers
	function handleContextMenu(event: MouseEvent) {
		if (!enableContextMenu) return;

		event.preventDefault();
		event.stopPropagation();

		contextMenuX = event.clientX;
		contextMenuY = event.clientY;
		contextMenuVisible = true;
	}

	function handleContextMenuClose() {
		contextMenuVisible = false;
	}
</script>

<div
	class="quick-input-bar"
	class:has-fab-right={hasFabRight}
	class:has-fab-left={hasFabLeft}
	class:quick-input-static={positioning === 'static'}
	style="--bottom-offset: {bottomOffset}"
>
	<!-- Results Panel (above input) -->
	{#if showPanel}
		<div class="results-panel" transition:slide={{ duration: 150 }}>
			{#if searchQuery.trim()}
				<!-- Create option (always first when available) -->
				{#if createPreview && onCreate}
					<button
						type="button"
						class="result-item create-option"
						class:selected={selectedIndex === 0}
						onclick={handleCreate}
						onmouseenter={() => (selectedIndex = 0)}
						disabled={creating}
					>
						<div class="result-avatar create-avatar">
							{#if creating}
								<div class="loading-spinner-small"></div>
							{:else}
								<DynamicIcon name="plus" size="md" />
							{/if}
						</div>
						<div class="result-info">
							<div class="result-name">{createPreview.title}</div>
							{#if createPreview.subtitle}
								<div class="result-subtitle">{createPreview.subtitle}</div>
							{/if}
						</div>
						<kbd class="create-shortcut">↵</kbd>
					</button>
				{/if}

				<!-- Deferred search option (shown before search is triggered) -->
				{#if deferSearch && !searchTriggered}
					<button
						type="button"
						class="result-item search-option"
						class:selected={selectedIndex === searchOptionIndex}
						onclick={triggerDeferredSearch}
						onmouseenter={() => (selectedIndex = searchOptionIndex)}
					>
						<div class="result-avatar search-avatar">
							<DynamicIcon name="search" size="md" />
						</div>
						<div class="result-info">
							<div class="result-name">"{searchQuery}" {searchText.toLowerCase()}</div>
						</div>
						<kbd class="create-shortcut">↵</kbd>
					</button>
				{:else if loading}
					<div class="loading-state">
						<div class="loading-spinner"></div>
						<span>{searchingText}</span>
					</div>
				{:else if results.length === 0 && !createPreview}
					<div class="empty-state">
						<span>{emptyText}</span>
					</div>
				{:else if results.length > 0}
					<div class="results-divider">
						<span>Suchergebnisse</span>
					</div>
					{#each results as item, index (item.id)}
						{@const adjustedIndex = index + (createPreview ? 1 : 0)}
						<button
							type="button"
							class="result-item"
							class:selected={adjustedIndex === selectedIndex}
							onclick={() => selectItem(item)}
							onmouseenter={() => (selectedIndex = adjustedIndex)}
						>
							<div class="result-avatar">
								{#if item.imageUrl}
									<img src={item.imageUrl} alt={item.title} />
								{:else}
									{getInitials(item)}
								{/if}
							</div>
							<div class="result-info">
								<div class="result-name">{item.title}</div>
								{#if item.subtitle}
									<div class="result-subtitle">{item.subtitle}</div>
								{/if}
							</div>
							{#if item.isFavorite}
								<span class="favorite-icon"><DynamicIcon name="heart-fill" size="md" /></span>
							{/if}
						</button>
					{/each}
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Input Bar (always visible) -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		class="input-container"
		class:create-success={createSuccess}
		oncontextmenu={handleContextMenu}
		role="toolbar"
	>
		<!-- Left action slot (e.g., voice input button) -->
		{#if leftAction}
			<div class="left-action">
				{@render leftAction()}
			</div>
		{/if}

		<div class="input-wrapper">
			<!-- Highlight backdrop (shows colored keywords) -->
			<div class="input-highlight-backdrop" aria-hidden="true">
				{@html highlightedQuery}&nbsp;
			</div>
			<!-- Actual input (transparent text, visible caret) -->
			<input
				bind:this={inputElement}
				type="text"
				{placeholder}
				bind:value={searchQuery}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onfocus={handleFocus}
				onblur={handleBlur}
				class="input-field"
			/>
		</div>

		{#if searchQuery.trim() && onCreate}
			<button
				type="button"
				class="submit-btn"
				onclick={handleCreate}
				disabled={creating}
				title={createText}
			>
				{#if creating}
					<div class="loading-spinner-small"></div>
				{:else}
					<DynamicIcon name="arrow-right" size="md" />
				{/if}
			</button>
		{/if}

		<!-- Right action slot (e.g., nav toggle) -->
		{#if rightAction}
			<div class="right-action">
				{@render rightAction()}
			</div>
		{/if}
	</div>

	<!-- Context Menu -->
	<InputBarContextMenu
		visible={contextMenuVisible}
		x={contextMenuX}
		y={contextMenuY}
		onClose={handleContextMenuClose}
		onSettingsChange={handleSettingsChange}
		{defaultOptions}
		{selectedDefaultId}
		{defaultOptionLabel}
		{onDefaultChange}
		{onShowShortcuts}
		{onShowSyntaxHelp}
	/>
</div>

<style>
	.quick-input-bar {
		position: fixed;
		bottom: calc(var(--bottom-offset, 70px) + env(safe-area-inset-bottom, 0px));
		left: 0;
		right: 0;
		z-index: 90;
		padding: 0.3125rem 1rem;
		pointer-events: none;
		/* Matches tags/tabbar slot (see bottomChromeHeight in (app)/+layout.svelte). */
		height: 64px;
		transition: bottom 0.3s ease;
	}

	.quick-input-static {
		position: relative;
		bottom: auto;
		z-index: auto;
	}

	/* Mobile: tighter padding, full-width input */
	@media (max-width: 640px) {
		.quick-input-bar {
			padding: 0.3125rem 0.5rem;
			height: 64px;
		}

		.input-container {
			padding: 0.5rem 1rem;
			height: 54px;
			gap: 0.5rem;
		}
	}

	/* Leave space for FAB on mobile */
	@media (max-width: 900px) {
		.quick-input-bar.has-fab-right {
			padding-right: calc(54px + 1rem + 0.75rem); /* FAB width + FAB right margin + gap */
		}
		.quick-input-bar.has-fab-left {
			padding-left: calc(54px + 1rem + 0.75rem); /* FAB width + FAB left margin + gap */
		}
	}

	.input-container,
	.results-panel,
	.submit-btn,
	.result-item {
		pointer-events: auto;
	}

	.input-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		background: hsl(var(--color-surface) / 0.85);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid hsl(var(--color-border));
		border-radius: 9999px;
		max-width: 700px;
		margin: 0 auto;
		box-shadow:
			0 4px 6px -1px hsl(var(--color-foreground) / 0.1),
			0 2px 4px -1px hsl(var(--color-foreground) / 0.06);
		transition: all 0.2s ease;
		/* Fixed height to prevent size changes */
		height: 54px;
	}

	.input-container:focus-within {
		border-color: hsl(var(--color-primary));
		box-shadow:
			0 4px 6px -1px hsl(var(--color-foreground) / 0.1),
			0 2px 4px -1px hsl(var(--color-foreground) / 0.06),
			0 0 0 2px hsl(var(--color-primary) / 0.25);
	}

	/* Success flash after creating */
	.input-container.create-success {
		border-color: hsl(var(--color-success, 142 71% 45%));
		box-shadow:
			0 4px 6px -1px hsl(var(--color-foreground) / 0.1),
			0 2px 4px -1px hsl(var(--color-foreground) / 0.06),
			0 0 0 2px hsl(var(--color-success, 142 71% 45%) / 0.3);
		animation: success-flash 1.2s ease-out;
	}

	@keyframes success-flash {
		0% {
			border-color: hsl(var(--color-success, 142 71% 45%));
			background: hsl(var(--color-success, 142 71% 45%) / 0.15);
		}
		40% {
			background: hsl(var(--color-success, 142 71% 45%) / 0.08);
		}
		100% {
			background: hsl(var(--color-surface) / 0.85);
		}
	}

	.left-action,
	.right-action {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.input-wrapper {
		position: relative;
		flex: 1;
		min-width: 0;
	}

	.input-highlight-backdrop {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		font-size: 1.125rem;
		font-family: inherit;
		white-space: pre;
		pointer-events: none;
		color: hsl(var(--color-foreground));
		overflow: hidden;
		line-height: 1.5;
	}

	.input-field {
		position: relative;
		width: 100%;
		border: none;
		background: transparent;
		font-size: 1.125rem;
		font-family: inherit;
		color: transparent;
		caret-color: hsl(var(--color-foreground));
		outline: none;
		z-index: 1;
		line-height: 1.5;
	}

	.input-field::placeholder {
		color: hsl(var(--color-muted-foreground));
	}

	/* Syntax highlighting colors - using theme-aware semantic colors */
	.input-highlight-backdrop :global(.hl-priority-urgent) {
		color: hsl(var(--color-error, 0 84% 60%));
		font-weight: 600;
	}

	.input-highlight-backdrop :global(.hl-priority-high) {
		color: hsl(var(--color-warning, 25 95% 53%));
		font-weight: 600;
	}

	.input-highlight-backdrop :global(.hl-priority-medium) {
		color: hsl(var(--color-warning, 48 96% 53%));
		font-weight: 600;
	}

	.input-highlight-backdrop :global(.hl-priority-low) {
		color: hsl(var(--color-success, 142 71% 45%));
		font-weight: 600;
	}

	.input-highlight-backdrop :global(.hl-tag) {
		color: hsl(var(--color-primary));
		font-weight: 500;
	}

	.input-highlight-backdrop :global(.hl-reference) {
		color: hsl(var(--color-success, 142 71% 45%));
		font-weight: 500;
	}

	.input-highlight-backdrop :global(.hl-date) {
		color: hsl(var(--color-primary));
		font-weight: 500;
	}

	.input-highlight-backdrop :global(.hl-time) {
		color: hsl(var(--color-primary));
		font-weight: 500;
	}

	.submit-btn {
		width: 2rem;
		height: 2rem;
		border-radius: 9999px;
		background: hsl(var(--color-primary));
		color: hsl(var(--color-primary-foreground, 0 0% 100%));
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all 0.15s ease;
	}

	.submit-btn:hover {
		transform: scale(1.05);
		filter: brightness(1.1);
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	/* Results Panel */
	.results-panel {
		position: absolute;
		bottom: 100%;
		left: 1rem;
		right: 1rem;
		max-width: 700px;
		margin: 0 auto 0.5rem;
		max-height: 320px;
		overflow-y: auto;
		background: hsl(var(--color-surface) / 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 1rem;
		border: 1px solid hsl(var(--color-border));
		box-shadow:
			0 4px 6px -1px hsl(var(--color-foreground) / 0.1),
			0 2px 4px -1px hsl(var(--color-foreground) / 0.06);
	}

	/* Result Items */
	.result-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.1s ease;
		color: hsl(var(--color-foreground));
	}

	.result-item:hover,
	.result-item.selected {
		background: hsl(var(--color-surface-hover));
	}

	.result-item.create-option {
		border-bottom: 1px solid hsl(var(--color-border));
	}

	.result-item.create-option:hover,
	.result-item.create-option.selected {
		background: hsl(var(--color-success) / 0.1);
	}

	.result-avatar {
		width: 36px;
		height: 36px;
		min-width: 36px;
		border-radius: 9999px;
		background: hsl(var(--color-primary));
		color: hsl(var(--color-primary-foreground, 0 0% 100%));
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.8125rem;
	}

	.result-avatar img {
		width: 100%;
		height: 100%;
		border-radius: 9999px;
		object-fit: cover;
	}

	.result-avatar.create-avatar {
		background: hsl(var(--color-success));
	}

	.result-item.search-option:hover,
	.result-item.search-option.selected {
		background: hsl(var(--color-primary) / 0.1);
	}

	.result-avatar.search-avatar {
		background: hsl(var(--color-muted-foreground) / 0.3);
	}

	.result-info {
		flex: 1;
		min-width: 0;
	}

	.result-name {
		font-weight: 500;
		color: hsl(var(--color-foreground));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-subtitle {
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.create-shortcut {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-family: inherit;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 4px;
		color: hsl(var(--color-muted-foreground));
		flex-shrink: 0;
	}

	.results-divider {
		padding: 0.5rem 1rem 0.25rem;
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: hsl(var(--color-muted-foreground));
	}

	/* Loading & Empty States */
	.loading-state,
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		color: hsl(var(--color-muted-foreground));
		font-size: 0.875rem;
	}

	.loading-spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid hsl(var(--color-border));
		border-top-color: hsl(var(--color-primary));
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.loading-spinner-small {
		width: 1rem;
		height: 1rem;
		border: 2px solid hsl(var(--color-border));
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
