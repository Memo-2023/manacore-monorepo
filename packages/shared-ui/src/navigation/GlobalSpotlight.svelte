<script lang="ts">
	import type {
		PillAppItem,
		SpotlightAction,
		ContentSearchResult,
		ContentSearchGroup,
		ContentSearcher,
	} from './types';
	import { createAppNavigationStore } from './appNavigationStore.svelte';
	import { SEARCH_DEBOUNCE_MS } from '../quick-input';

	interface Props {
		open: boolean;
		onClose: () => void;
		apps: PillAppItem[];
		quickActions?: SpotlightAction[];
		placeholder?: string;
		/** Content searcher for cross-app IndexedDB search */
		contentSearcher?: ContentSearcher;
	}

	let {
		open,
		onClose,
		apps,
		quickActions = [],
		placeholder = 'Was möchtest du tun?',
		contentSearcher,
	}: Props = $props();

	const store = createAppNavigationStore();

	let searchQuery = $state('');
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement | undefined>(undefined);
	let contentResults = $state<ContentSearchGroup[]>([]);
	let contentLoading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let abortController: AbortController | undefined;

	// Build combined results list (apps + actions)
	interface SpotlightResult {
		type: 'app' | 'action' | 'content';
		id: string;
		label: string;
		description?: string;
		icon?: string;
		imageUrl?: string;
		shortcut?: string;
		category?: string;
		href?: string;
		appColor?: string;
	}

	const results = $derived.by(() => {
		const items: SpotlightResult[] = [];
		const q = searchQuery.toLowerCase();

		if (!q) {
			// No query: show recents then actions
			const recentIds = store.recentApps.map((r) => r.id);
			const recentApps = recentIds
				.map((id) => apps.find((a) => a.id === id))
				.filter(Boolean) as PillAppItem[];

			for (const app of recentApps.slice(0, 5)) {
				items.push({
					type: 'app',
					id: app.id,
					label: app.name,
					imageUrl: app.icon,
					category: 'Zuletzt verwendet',
				});
			}

			for (const action of quickActions) {
				items.push({
					type: 'action',
					id: action.id,
					label: action.label,
					description: action.description,
					icon: action.icon,
					shortcut: action.shortcut,
					category: action.category || 'Aktionen',
				});
			}
		} else {
			// Filter apps
			const matchedApps = apps.filter((a) => a.name.toLowerCase().includes(q));
			for (const app of matchedApps) {
				items.push({
					type: 'app',
					id: app.id,
					label: app.name,
					imageUrl: app.icon,
					category: 'Apps',
				});
			}

			// Filter actions
			const matchedActions = quickActions.filter(
				(a) => a.label.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
			);
			for (const action of matchedActions) {
				items.push({
					type: 'action',
					id: action.id,
					label: action.label,
					description: action.description,
					icon: action.icon,
					shortcut: action.shortcut,
					category: action.category || 'Aktionen',
				});
			}

			// Append content search results
			for (const group of contentResults) {
				for (const result of group.results) {
					items.push({
						type: 'content',
						id: result.id,
						label: result.title,
						description: result.subtitle,
						imageUrl: group.appIcon,
						category: group.appName,
						href: result.href,
						appColor: group.appColor,
					});
				}
			}
		}

		return items;
	});

	// Trigger content search on query change
	$effect(() => {
		const q = searchQuery.trim();
		if (!q || !contentSearcher) {
			contentResults = [];
			contentLoading = false;
			return;
		}

		contentLoading = true;
		clearTimeout(debounceTimer);
		abortController?.abort();

		debounceTimer = setTimeout(async () => {
			abortController = new AbortController();
			const { signal } = abortController;
			try {
				const groups = await contentSearcher!(q, signal);
				if (!signal.aborted) {
					contentResults = groups;
					contentLoading = false;
				}
			} catch {
				if (!signal.aborted) {
					contentResults = [];
					contentLoading = false;
				}
			}
		}, SEARCH_DEBOUNCE_MS);
	});

	// Group results by category for display
	const groupedResults = $derived.by(() => {
		const groups: { category: string; items: SpotlightResult[] }[] = [];
		const seen = new Set<string>();

		for (const item of results) {
			const cat = item.category || '';
			if (!seen.has(cat)) {
				seen.add(cat);
				groups.push({ category: cat, items: [] });
			}
			groups.find((g) => g.category === cat)!.items.push(item);
		}

		return groups;
	});

	// Clamp selected index
	$effect(() => {
		if (selectedIndex >= results.length) {
			selectedIndex = Math.max(0, results.length - 1);
		}
	});

	// Focus input on open
	$effect(() => {
		if (open) {
			searchQuery = '';
			selectedIndex = 0;
			contentResults = [];
			contentLoading = false;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	function handleSelect(item: SpotlightResult) {
		if (item.type === 'content' && item.href) {
			window.location.href = item.href;
			onClose();
			return;
		}

		if (item.type === 'app') {
			const app = apps.find((a) => a.id === item.id);
			if (app) {
				store.recordAppVisit(app.id);
				if (app.isCurrent) {
					window.location.href = '/';
				} else if (app.url) {
					const isInternal =
						app.url.startsWith('/') ||
						new URL(app.url, window.location.origin).origin === window.location.origin;
					if (isInternal) {
						window.location.href = app.url;
					} else {
						window.open(app.url, '_blank', 'noopener,noreferrer');
					}
				}
			}
		} else {
			const action = quickActions.find((a) => a.id === item.id);
			action?.onExecute();
		}
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % Math.max(1, results.length);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = (selectedIndex - 1 + results.length) % Math.max(1, results.length);
		} else if (event.key === 'Enter' && results[selectedIndex]) {
			event.preventDefault();
			handleSelect(results[selectedIndex]);
		} else if (event.key === 'Escape') {
			onClose();
		}
	}

	// Track the flat index for highlighting
	function getFlatIndex(groupIndex: number, itemIndex: number): number {
		let idx = 0;
		for (let g = 0; g < groupIndex; g++) {
			idx += groupedResults[g].items.length;
		}
		return idx + itemIndex;
	}

	const iconPaths: Record<string, string> = {
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		plus: 'M12 4v16m8-8H4',
		arrow: 'M13 7l5 5m0 0l-5 5m5-5H6',
	};
</script>

{#if open}
	<div
		class="spotlight-overlay"
		onclick={onClose}
		onkeydown={handleKeydown}
		role="presentation"
		tabindex="-1"
	>
		<div
			class="spotlight-modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="none"
		>
			<!-- Search input -->
			<div class="spotlight-input-wrapper">
				<svg class="spotlight-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d={iconPaths.search}
					/>
				</svg>
				<input
					bind:this={inputEl}
					bind:value={searchQuery}
					type="text"
					{placeholder}
					class="spotlight-input"
					onkeydown={handleKeydown}
				/>
				<kbd class="spotlight-kbd">Esc</kbd>
			</div>

			<!-- Results -->
			{#if results.length > 0}
				<div class="spotlight-results">
					{#each groupedResults as group, gi}
						{#if group.category}
							<div class="spotlight-category">{group.category}</div>
						{/if}
						{#each group.items as item, ii}
							{@const flatIdx = getFlatIndex(gi, ii)}
							<button
								class="spotlight-item"
								class:selected={flatIdx === selectedIndex}
								onclick={() => handleSelect(item)}
								onmouseenter={() => (selectedIndex = flatIdx)}
							>
								<div class="spotlight-item-left">
									{#if item.imageUrl}
										<img src={item.imageUrl} alt="" class="spotlight-item-icon" />
									{:else if item.icon && iconPaths[item.icon]}
										<svg
											class="spotlight-item-svg"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d={iconPaths[item.icon]}
											/>
										</svg>
									{:else if item.type === 'content' && item.appColor}
										<span class="spotlight-content-dot" style:background={item.appColor}></span>
									{:else}
										<span class="spotlight-item-dot">
											{item.type === 'app' ? '\u{1F4F1}' : '\u{26A1}'}
										</span>
									{/if}
									<div class="spotlight-item-text">
										<span class="spotlight-item-label">{item.label}</span>
										{#if item.description}
											<span class="spotlight-item-desc">{item.description}</span>
										{/if}
									</div>
								</div>
								{#if item.shortcut}
									<kbd class="spotlight-shortcut">{item.shortcut}</kbd>
								{:else if item.type === 'content'}
									<svg
										class="spotlight-item-arrow"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d={iconPaths.arrow}
										/>
									</svg>
								{/if}
							</button>
						{/each}
					{/each}
					{#if contentLoading}
						<div class="spotlight-loading">
							<span class="spotlight-loading-dot"></span>
							<span class="spotlight-loading-dot"></span>
							<span class="spotlight-loading-dot"></span>
						</div>
					{/if}
				</div>
			{:else if searchQuery && !contentLoading}
				<div class="spotlight-empty">Keine Ergebnisse</div>
			{:else if searchQuery && contentLoading}
				<div class="spotlight-loading-full">
					<span class="spotlight-loading-dot"></span>
					<span class="spotlight-loading-dot"></span>
					<span class="spotlight-loading-dot"></span>
				</div>
			{/if}

			<!-- Footer hints -->
			<div class="spotlight-footer">
				<span class="spotlight-hint"><kbd>↑↓</kbd> Navigation</span>
				<span class="spotlight-hint"><kbd>↵</kbd> Auswählen</span>
				<span class="spotlight-hint"><kbd>Esc</kbd> Schließen</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.spotlight-overlay {
		position: fixed;
		inset: 0;
		z-index: 99999;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: min(20vh, 160px);
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		animation: fadeIn 0.1s ease-out;
	}

	:global(.dark) .spotlight-overlay {
		background: rgba(0, 0, 0, 0.6);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.spotlight-modal {
		width: 100%;
		max-width: 560px;
		margin: 0 1rem;
		background: rgba(255, 255, 255, 0.98);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 1rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		overflow: hidden;
		animation: slideDown 0.15s ease-out;
	}

	:global(.dark) .spotlight-modal {
		background: rgba(30, 30, 35, 0.98);
		border-color: rgba(255, 255, 255, 0.12);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-16px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* Input */
	.spotlight-input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}

	@media (min-width: 641px) {
		.spotlight-input-wrapper {
			padding: 1rem 1.25rem;
		}
	}

	:global(.dark) .spotlight-input-wrapper {
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	.spotlight-search-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		opacity: 0.4;
	}

	.spotlight-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		font-size: 1rem;
		color: inherit;
	}

	.spotlight-input::placeholder {
		color: rgba(0, 0, 0, 0.35);
	}

	:global(.dark) .spotlight-input::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.spotlight-kbd {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background: rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.1);
		color: rgba(0, 0, 0, 0.4);
		font-family: inherit;
	}

	:global(.dark) .spotlight-kbd {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.4);
	}

	/* Results */
	.spotlight-results {
		max-height: 50vh;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.spotlight-category {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.5rem 0.5rem 0.25rem;
		opacity: 0.45;
	}

	.spotlight-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.625rem 0.75rem;
		min-height: 44px;
		border: none;
		background: none;
		border-radius: 0.5rem;
		cursor: pointer;
		color: inherit;
		text-align: left;
		transition: background 0.08s;
	}

	.spotlight-item:hover,
	.spotlight-item.selected {
		background: rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .spotlight-item:hover,
	:global(.dark) .spotlight-item.selected {
		background: rgba(255, 255, 255, 0.08);
	}

	.spotlight-item-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
	}

	.spotlight-item-icon {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 0.375rem;
		flex-shrink: 0;
	}

	.spotlight-item-svg {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		opacity: 0.5;
	}

	.spotlight-item-dot {
		font-size: 1rem;
		width: 1.5rem;
		text-align: center;
		flex-shrink: 0;
	}

	.spotlight-item-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.spotlight-item-label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.spotlight-item-desc {
		font-size: 0.75rem;
		opacity: 0.5;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.spotlight-shortcut {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background: rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.1);
		color: rgba(0, 0, 0, 0.4);
		font-family: inherit;
		flex-shrink: 0;
	}

	:global(.dark) .spotlight-shortcut {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.4);
	}

	/* Empty */
	.spotlight-empty {
		padding: 2rem;
		text-align: center;
		font-size: 0.875rem;
		opacity: 0.5;
	}

	/* Footer */
	.spotlight-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
	}

	:global(.dark) .spotlight-footer {
		border-top-color: rgba(255, 255, 255, 0.1);
	}

	.spotlight-hint {
		font-size: 0.6875rem;
		opacity: 0.4;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.spotlight-hint kbd {
		font-size: 0.625rem;
		padding: 0.0625rem 0.25rem;
		border-radius: 0.1875rem;
		background: rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.08);
		font-family: inherit;
	}

	:global(.dark) .spotlight-hint kbd {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	/* Content search dot (colored by app) */
	.spotlight-content-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
		margin: 0 0.25rem;
	}

	.spotlight-item-arrow {
		width: 1rem;
		height: 1rem;
		opacity: 0.3;
		flex-shrink: 0;
	}

	/* Loading indicator */
	.spotlight-loading,
	.spotlight-loading-full {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.75rem;
	}

	.spotlight-loading-full {
		padding: 2rem;
	}

	.spotlight-loading-dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: currentColor;
		opacity: 0.3;
		animation: spotlightPulse 1s ease-in-out infinite;
	}

	.spotlight-loading-dot:nth-child(2) {
		animation-delay: 0.15s;
	}

	.spotlight-loading-dot:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes spotlightPulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 0.8;
		}
	}

	/* Mobile */
	@media (max-width: 640px) {
		.spotlight-overlay {
			padding-top: 0;
			align-items: flex-end;
		}

		.spotlight-modal {
			max-width: none;
			margin: 0;
			border-radius: 1rem 1rem 0 0;
			max-height: 85vh;
			animation: spotlightSlideUp 0.2s ease-out;
		}

		.spotlight-results {
			max-height: 60vh;
		}

		.spotlight-footer {
			display: none;
		}

		.spotlight-input {
			font-size: 1rem;
		}
	}

	@keyframes spotlightSlideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
