<script lang="ts">
	import type { PillAppItem } from './types';
	import { createAppNavigationStore } from './appNavigationStore.svelte';

	interface Props {
		apps: PillAppItem[];
		isOpen: boolean;
		onToggle: (open: boolean) => void;
		onAppClick?: (app: PillAppItem, event: MouseEvent) => void;
		onOpenInPanel?: (appId: string, url: string) => void;
		allAppsHref?: string;
		allAppsLabel?: string;
		triggerLabel: string;
	}

	let {
		apps,
		isOpen,
		onToggle,
		onAppClick,
		onOpenInPanel,
		allAppsHref,
		allAppsLabel = 'Alle Apps',
		triggerLabel,
	}: Props = $props();

	const store = createAppNavigationStore();

	let triggerButton: HTMLButtonElement;
	let searchInput = $state<HTMLInputElement | undefined>(undefined);
	let panelPosition = $state({ bottom: 0, left: 0 });
	let searchQuery = $state('');

	// Filter apps by search
	const filteredApps = $derived(
		searchQuery
			? apps.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
			: apps
	);

	// Resolve favorites and recents to actual PillAppItem objects
	const favoriteApps = $derived(
		store.favorites.map((id) => apps.find((a) => a.id === id)).filter(Boolean) as PillAppItem[]
	);

	const recentApps = $derived(
		store.recentApps.map((r) => apps.find((a) => a.id === r.id)).filter(Boolean) as PillAppItem[]
	);

	function toggle() {
		if (triggerButton) {
			const rect = triggerButton.getBoundingClientRect();
			panelPosition = { bottom: window.innerHeight - rect.top + 8, left: rect.left };
		}
		onToggle(!isOpen);
	}

	function close() {
		searchQuery = '';
		onToggle(false);
	}

	function handleAppClick(app: PillAppItem, event: MouseEvent) {
		store.recordAppVisit(app.id);

		if (onAppClick) {
			onAppClick(app, event);
		} else if (app.url) {
			// Always open in new tab
			window.open(app.url, '_blank', 'noopener,noreferrer');
		}

		close();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}

	$effect(() => {
		if (isOpen && searchInput) {
			// Focus search input after panel opens
			requestAnimationFrame(() => searchInput?.focus());
		}
	});

	const iconPaths = {
		grid: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
		chevronDown: 'M19 9l-7 7-7-7',
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		star: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
		starFilled:
			'M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z',
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="app-drawer" onkeydown={handleKeydown} role="navigation">
	<!-- Trigger Button -->
	<button
		bind:this={triggerButton}
		onclick={toggle}
		class="pill glass-pill trigger-button icon-only"
		aria-label={triggerLabel}
		title={triggerLabel}
	>
		<svg class="pill-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPaths.grid} />
		</svg>
	</button>

	{#if isOpen}
		<!-- Backdrop -->
		<button class="drawer-backdrop" onclick={close} aria-label="Close app drawer"></button>

		<!-- Panel -->
		<div
			class="drawer-panel"
			style="bottom: {panelPosition.bottom}px; left: {panelPosition.left}px;"
			role="dialog"
			aria-label="App switcher"
		>
			<!-- Search -->
			<div class="drawer-search">
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d={iconPaths.search}
					/>
				</svg>
				<input
					bind:this={searchInput}
					bind:value={searchQuery}
					type="text"
					placeholder="App suchen..."
					class="search-input"
				/>
			</div>

			<div class="drawer-content">
				<!-- Favorites section -->
				{#if !searchQuery && favoriteApps.length > 0}
					<div class="drawer-section">
						<div class="section-header">Favoriten</div>
						<div class="app-chips">
							{#each favoriteApps as app (app.id)}
								<button
									class="app-chip"
									class:current={app.isCurrent}
									onclick={(e) => handleAppClick(app, e)}
									title={app.name}
								>
									{#if app.icon}
										<img src={app.icon} alt="" class="app-chip-icon" />
									{:else}
										<span class="app-chip-letter" style="color: {app.color}"
											>{app.name.charAt(0)}</span
										>
									{/if}
									<span class="app-chip-name">{app.name}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Recents section -->
				{#if !searchQuery && recentApps.length > 0}
					<div class="drawer-section">
						<div class="section-header">Zuletzt verwendet</div>
						<div class="app-chips">
							{#each recentApps.slice(0, 5) as app (app.id)}
								<button
									class="app-chip"
									class:current={app.isCurrent}
									onclick={(e) => handleAppClick(app, e)}
									title={app.name}
								>
									{#if app.icon}
										<img src={app.icon} alt="" class="app-chip-icon" />
									{:else}
										<span class="app-chip-letter" style="color: {app.color}"
											>{app.name.charAt(0)}</span
										>
									{/if}
									<span class="app-chip-name">{app.name}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- All apps grid -->
				<div class="drawer-section">
					{#if !searchQuery}
						<div class="section-header">Alle Apps</div>
					{/if}
					<div class="app-grid">
						{#each filteredApps as app (app.id)}
							<div class="app-grid-item">
								<button
									class="app-grid-button"
									class:current={app.isCurrent}
									onclick={(e) => handleAppClick(app, e)}
									title="{app.name}{app.isCurrent ? ' (aktuelle App)' : ''}"
								>
									{#if app.icon}
										<img src={app.icon} alt="" class="app-grid-icon" />
									{:else}
										<span class="app-grid-letter" style="color: {app.color}"
											>{app.name.charAt(0)}</span
										>
									{/if}
									<span class="app-grid-name">{app.name}</span>
								</button>
								<button
									class="fav-toggle"
									onclick={() => store.toggleFavorite(app.id)}
									title={store.isFavorite(app.id)
										? 'Aus Favoriten entfernen'
										: 'Zu Favoriten hinzufügen'}
								>
									<svg viewBox="0 0 24 24" class="fav-icon" class:is-fav={store.isFavorite(app.id)}>
										<path
											d={store.isFavorite(app.id) ? iconPaths.starFilled : iconPaths.star}
											fill={store.isFavorite(app.id) ? 'currentColor' : 'none'}
											stroke={store.isFavorite(app.id) ? 'none' : 'currentColor'}
											stroke-width="1.5"
										/>
									</svg>
								</button>
							</div>
						{/each}
					</div>

					{#if filteredApps.length === 0}
						<div class="empty-state">Keine Apps gefunden</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			{#if allAppsHref}
				<a href={allAppsHref} class="drawer-footer" onclick={close}>
					{allAppsLabel}
					<svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.app-drawer {
		position: relative;
		z-index: 1;
	}

	.app-drawer:has(.drawer-panel) {
		z-index: 10000;
	}

	/* Trigger - matches PillDropdown */
	.trigger-button {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.pill-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.trigger-button.icon-only {
		gap: 0;
		padding: 0.5rem 0.625rem;
	}

	/* Solid theme-tokened pill (formerly the "glass" frosted pill). */
	.glass-pill {
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		box-shadow:
			0 1px 2px hsl(0 0% 0% / 0.05),
			0 2px 6px hsl(0 0% 0% / 0.04);
		color: hsl(var(--color-foreground));
	}

	.glass-pill:hover {
		background: hsl(var(--color-surface-hover));
		border-color: hsl(var(--color-border));
		box-shadow:
			0 6px 12px hsl(0 0% 0% / 0.08),
			0 2px 4px hsl(0 0% 0% / 0.05);
	}

	/* Backdrop */
	.drawer-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9998;
		background: rgba(0, 0, 0, 0.1);
		border: none;
		cursor: default;
	}

	:global(.dark) .drawer-backdrop {
		background: rgba(0, 0, 0, 0.3);
	}

	/* Panel */
	.drawer-panel {
		position: fixed;
		z-index: 9999;
		width: 320px;
		max-height: 70vh;
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 1rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.15),
			0 8px 10px -6px rgba(0, 0, 0, 0.1);
		animation: panelIn 0.15s ease-out;
		overflow: hidden;
	}

	:global(.dark) .drawer-panel {
		background: rgba(30, 30, 35, 0.95);
		border-color: rgba(255, 255, 255, 0.12);
	}

	@keyframes panelIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Search */
	.drawer-search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		min-height: 48px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}

	:global(.dark) .drawer-search {
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	.search-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		opacity: 0.4;
	}

	.search-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		font-size: 0.875rem;
		color: inherit;
	}

	.search-input::placeholder {
		color: rgba(0, 0, 0, 0.35);
	}

	:global(.dark) .search-input::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	/* Content */
	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	/* Sections */
	.drawer-section {
		margin-bottom: 0.25rem;
	}

	.section-header {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.375rem 0.5rem 0.25rem;
		opacity: 0.5;
	}

	/* App chips (favorites, recents) */
	.app-chips {
		display: flex;
		gap: 0.375rem;
		padding: 0.25rem 0.25rem 0.5rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.app-chips::-webkit-scrollbar {
		display: none;
	}

	.app-chip {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		min-height: 44px;
		border-radius: 9999px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		background: rgba(0, 0, 0, 0.03);
		font-size: 0.8125rem;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s;
	}

	:global(.dark) .app-chip {
		border-color: rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.06);
	}

	.app-chip:hover {
		background: rgba(0, 0, 0, 0.08);
		border-color: rgba(0, 0, 0, 0.15);
	}

	:global(.dark) .app-chip:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.app-chip.current {
		border-color: var(--pill-primary-color, rgba(99, 102, 241, 0.4));
		background: var(--pill-primary-color, rgba(99, 102, 241, 0.1));
	}

	.app-chip-icon {
		width: 1rem;
		height: 1rem;
		border-radius: 0.1875rem;
	}

	.app-chip-letter {
		font-weight: 600;
		font-size: 0.75rem;
	}

	.app-chip-name {
		font-weight: 500;
	}

	/* App grid */
	.app-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1px;
	}

	.app-grid-item {
		display: flex;
		align-items: center;
	}

	.app-grid-button {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		min-height: 44px;
		border-radius: 0.5rem;
		border: none;
		background: none;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.1s;
		color: inherit;
	}

	.app-grid-button:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .app-grid-button:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.app-grid-button.current {
		background: rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .app-grid-button.current {
		background: rgba(255, 255, 255, 0.06);
	}

	.app-grid-icon {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}

	.app-grid-letter {
		width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.app-grid-name {
		flex: 1;
		text-align: left;
	}

	/* Favorite toggle */
	.fav-toggle {
		padding: 0.375rem;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: background 0.1s;
		flex-shrink: 0;
	}

	.fav-toggle:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .fav-toggle:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.fav-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: rgba(0, 0, 0, 0.25);
		transition: color 0.15s;
	}

	:global(.dark) .fav-icon {
		color: rgba(255, 255, 255, 0.25);
	}

	.fav-icon.is-fav {
		color: hsl(var(--color-warning));
	}

	/* Empty state */
	.empty-state {
		padding: 1.5rem;
		text-align: center;
		font-size: 0.8125rem;
		opacity: 0.5;
	}

	/* Footer */
	.drawer-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.625rem;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
		font-size: 0.8125rem;
		font-weight: 500;
		color: inherit;
		text-decoration: none;
		opacity: 0.6;
		transition: opacity 0.15s;
	}

	:global(.dark) .drawer-footer {
		border-top-color: rgba(255, 255, 255, 0.1);
	}

	.drawer-footer:hover {
		opacity: 1;
	}

	.arrow-icon {
		width: 0.75rem;
		height: 0.75rem;
	}

	/* Mobile: bottom sheet */
	@media (max-width: 640px) {
		.drawer-panel {
			position: fixed;
			top: auto !important;
			left: 0 !important;
			right: 0;
			bottom: 0;
			width: 100%;
			max-height: 80vh;
			border-radius: 1rem 1rem 0 0;
			animation: slideUp 0.2s ease-out;
		}

		@keyframes slideUp {
			from {
				transform: translateY(100%);
			}
			to {
				transform: translateY(0);
			}
		}

		.drawer-backdrop {
			background: rgba(0, 0, 0, 0.3);
		}
	}
</style>
