<script lang="ts">
	import type { Snippet } from 'svelte';
	import type {
		PillNavItem,
		PillDropdownItem,
		PillNavElement,
		PillTabGroupConfig,
		PillTagSelectorConfig,
		PillAppItem,
		PillBarConfig,
		SpotlightAction,
		ContentSearcher,
	} from './types';
	import PillDropdown from './PillDropdown.svelte';
	import PillTabGroup from './PillTabGroup.svelte';
	import PillTagSelector from './PillTagSelector.svelte';
	import Pill from './Pill.svelte';
	import ManaLogoIcon from './ManaLogoIcon.svelte';
	import AppDrawer from './AppDrawer.svelte';
	import UserMenuPanel from './UserMenuPanel.svelte';
	import GlobalSpotlight from './GlobalSpotlight.svelte';
	import { createGlobalSpotlightState } from './useGlobalSpotlight.svelte';
	// Phosphor Icons (via shared-icons)
	import {
		Archive,
		Bell,
		Buildings,
		CalendarBlank,
		CaretDown,
		CaretLeft,
		CaretRight,
		CaretUp,
		ChartBar,
		ChatCircle,
		Check,
		CheckCircle,
		CheckSquare,
		Clock,
		Cloud,
		Columns,
		Compass,
		CreditCard,
		File,
		FileText,
		Fire,
		Folder,
		Funnel,
		Gear,
		Gift,
		Globe,
		GridFour,
		Heart,
		HeartHalf,
		House,
		Key,
		List,
		MagnifyingGlass,
		Microphone,
		Moon,
		MusicNote,
		MusicNotes,
		Palette,
		Playlist,
		Plus,
		Question,
		Robot,
		Scales,
		ShareFat,
		ShareNetwork,
		Shield,
		SignOut,
		Sparkle,
		Spiral,
		Cards,
		Sun,
		Tag,
		Target,
		Timer,
		Trash,
		Tray,
		Upload,
		User,
		Users,
		Waveform,
	} from '@mana/shared-icons';

	// Map icon names to Phosphor components
	const phosphorIcons: Record<string, any> = {
		home: House,
		users: Users,
		user: User,
		tag: Tag,
		heart: Heart,
		settings: Gear,
		chat: ChatCircle,
		'help-circle': Question,
		'share-2': ShareNetwork,
		bell: Bell,
		clock: Clock,
		timer: Timer,
		target: Target,
		globe: Globe,
		inbox: Tray,
		check: Check,
		checkCircle: CheckCircle,
		'check-square': CheckSquare,
		plus: Plus,
		columns: Columns,
		kanban: Columns,
		tabs: Cards,
		mic: Microphone,
		calendar: CalendarBlank,
		folder: Folder,
		archive: Archive,
		upload: Upload,
		music: MusicNote,
		document: File,
		chart: ChartBar,
		'bar-chart-3': ChartBar,
		search: MagnifyingGlass,
		list: List,
		compass: Compass,
		moon: Moon,
		sun: Sun,
		logout: SignOut,
		chevronDown: CaretDown,
		chevronUp: CaretUp,
		chevronLeft: CaretLeft,
		menu: List,
		fire: Fire,
		grid: GridFour,
		gridSmall: GridFour,
		palette: Palette,
		creditCard: CreditCard,
		building: Buildings,
		scale: Scales,
		robot: Robot,
		key: Key,
		'heart-half': HeartHalf,
		shield: Shield,
		gift: Gift,
		'music-notes': MusicNotes,
		playlist: Playlist,
		waveform: Waveform,
		'file-text': FileText,
		sparkle: Sparkle,
		sparkles: Sparkle,
		spiral: Spiral,
		share: ShareFat,
		trash: Trash,
		filter: Funnel,
		cloud: Cloud,
	};

	// Convert app items to dropdown items (will be computed as derived)
	function createAppDropdownItems(
		apps: PillAppItem[],
		allAppsUrl?: string,
		allAppsText?: string,
		openInPanelHandler?: (appId: string, url: string) => void
	): PillDropdownItem[] {
		const items: PillDropdownItem[] = apps.map((app) => ({
			id: app.id,
			label: app.name,
			// Use image icon if available, otherwise use grid as fallback
			imageUrl: app.icon,
			icon: app.icon ? undefined : 'grid',
			onClick: (event?: MouseEvent) => {
				// Check for modifier keys (Ctrl/Cmd + Click opens in panel)
				if (
					event &&
					(event.ctrlKey || event.metaKey) &&
					openInPanelHandler &&
					app.url &&
					!app.isCurrent
				) {
					openInPanelHandler(app.id, app.url);
					return;
				}

				if (app.isCurrent) {
					// Navigate to home route for current app
					window.location.href = '/';
				} else if (app.url) {
					// Internal paths (same-origin) navigate directly, external URLs open in new tab
					const isInternal =
						app.url.startsWith('/') ||
						new URL(app.url, window.location.origin).origin === window.location.origin;
					if (isInternal) {
						window.location.href = app.url;
					} else {
						window.open(app.url, '_blank', 'noopener,noreferrer');
					}
				}
			},
			active: app.isCurrent,
			disabled: false,
			// Show split button if handler is provided and app is not current
			showSplitButton: !!openInPanelHandler && !app.isCurrent && !!app.url,
			onSplitClick:
				openInPanelHandler && app.url ? () => openInPanelHandler(app.id, app.url!) : undefined,
		}));

		// Add "All Apps" link at the end if href is provided
		if (allAppsUrl) {
			items.push(
				{ id: 'all-apps-divider', label: '', divider: true },
				{
					id: 'all-apps',
					label: allAppsText || 'Alle Apps',
					icon: 'grid',
					onClick: () => {
						window.location.href = allAppsUrl;
					},
					active: false,
				}
			);
		}

		return items;
	}

	interface Props {
		/** Navigation items */
		items: PillNavItem[];
		/** Current active path */
		currentPath?: string;
		/** Logo snippet */
		logo?: Snippet;
		/** App name */
		appName?: string;
		/** Home/default route */
		homeRoute?: string;
		/** Called when logout is clicked */
		onLogout?: () => void;
		/** Called when theme toggle is clicked */
		onToggleTheme?: () => void;
		/** Whether dark mode is active */
		isDark?: boolean;
		/** Use 'static' when inside a flex container (bottom-stack pattern). Default: 'fixed'. */
		positioning?: 'fixed' | 'static';
		/** Whether navigation is collapsed */
		isCollapsed?: boolean;
		/** Called when collapsed state changes */
		onCollapsedChange?: (isCollapsed: boolean) => void;
		/** Language dropdown items */
		languageItems?: PillDropdownItem[];
		/** Current language label */
		currentLanguageLabel?: string;
		/** Show language switcher */
		showLanguageSwitcher?: boolean;
		/** Show theme toggle (standalone button, hidden if showThemeVariants is true) */
		showThemeToggle?: boolean;
		/** Show AI tier selector dropdown */
		showAiTierSelector?: boolean;
		/** AI tier dropdown items (each representing a toggleable tier) */
		aiTierItems?: PillDropdownItem[];
		/** Current AI tier label, e.g. "Browser" or "Server" */
		currentAiTierLabel?: string;
		/** Current AI tier icon name (passed to the dropdown trigger) */
		currentAiTierIcon?: string;
		/** Show sync status dropdown */
		showSyncStatus?: boolean;
		/** Sync status dropdown items */
		syncStatusItems?: PillDropdownItem[];
		/** Current sync status label */
		currentSyncLabel?: string;
		/** Primary color for active state (CSS custom property or hex) */
		primaryColor?: string;
		/** Elements to prepend before nav items (tab groups, dividers, nav items) */
		prependElements?: PillNavElement[];
		/** Additional elements (tab groups, dividers) to show after nav items */
		elements?: PillNavElement[];
		/**
		 * Snippet rendered at the very start of the bar, before the app
		 * switcher. Lets the host drop a custom component (e.g. Space
		 * switcher) into the nav without adding more dedicated props.
		 */
		startSlot?: import('svelte').Snippet;
		/** Show logout button */
		showLogout?: boolean;
		/** Theme variant dropdown items */
		themeVariantItems?: PillDropdownItem[];
		/** Current theme variant label */
		currentThemeVariantLabel?: string;
		/** Show theme variant selector */
		showThemeVariants?: boolean;
		/** Current theme mode ('light', 'dark', 'system') */
		themeMode?: 'light' | 'dark' | 'system';
		/** Called when theme mode changes */
		onThemeModeChange?: (mode: 'light' | 'dark' | 'system') => void;
		/** App items for app switcher dropdown */
		appItems?: PillAppItem[];
		/** Show app switcher dropdown */
		showAppSwitcher?: boolean;
		/** User email for user dropdown */
		userEmail?: string;
		/** Profile page href */
		profileHref?: string;
		/** Login page href (shown when not logged in) */
		loginHref?: string;
		// A11y Settings
		/** A11y contrast level */
		a11yContrast?: 'normal' | 'high';
		/** Called when a11y contrast changes */
		onA11yContrastChange?: (contrast: 'normal' | 'high') => void;
		/** A11y reduce motion setting */
		a11yReduceMotion?: boolean;
		/** Called when a11y reduce motion changes */
		onA11yReduceMotionChange?: (reduce: boolean) => void;
		/** Show a11y quick toggles in theme dropdown */
		showA11yQuickToggles?: boolean;
		/** Called when an app should be opened in a split panel */
		onOpenInPanel?: (appId: string, url: string) => void;
		/** Quick actions for Cmd+K spotlight (pass to enable spotlight) */
		spotlightActions?: SpotlightAction[];
		/** Placeholder text for spotlight search */
		spotlightPlaceholder?: string;
		/** Content searcher for cross-app search in spotlight */
		contentSearcher?: ContentSearcher;
		/** Accessible label for the nav element */
		ariaLabel?: string;
		/** Feedback page href (shown in user dropdown). Set to empty string to hide.
		 *  Ignored when `onFeedback` is provided — the action takes precedence. */
		feedbackHref?: string;
		/** Called when the user picks "Idee teilen" in the user menu. When set,
		 *  the Feedback chip opens the host's quick-feedback modal instead of
		 *  navigating to feedbackHref. */
		onFeedback?: () => void;
		/** Themes page href (shown in user dropdown). Set to empty string to hide. */
		themesHref?: string;
		/** Spiral page href (shown in user dropdown). Set to empty string to hide. */
		spiralHref?: string;
		/** Credits page href (shown in user dropdown). Set to empty string to hide. */
		creditsHref?: string;
		/** Trigger label for the user dropdown when no one is signed in. */
		guestMenuLabel?: string;
		/** Help page href (shown in user dropdown). Set to empty string to hide. */
		helpHref?: string;
		/** Bottom offset from viewport bottom (default: '0px'). Use to position above other fixed bars. */
		bottomOffset?: string;
		/** When provided, dropdown triggers (theme, AI tier, sync, user menu) render
		 *  as plain pills that call this callback with a bar config instead of
		 *  opening their in-place PillDropdown popover. The host is expected to
		 *  render the returned items in its own bar (e.g. bottom-stack). Pass null
		 *  to request closing the active bar. */
		onOpenBar?: (config: PillBarConfig | null) => void;
		/** Id of the bar currently open in the host. Used to highlight the trigger pill. */
		activeBarId?: string | null;
	}

	let {
		items,
		currentPath = '',
		logo,
		appName = 'App',
		homeRoute = '/',
		onLogout,
		onToggleTheme,
		isDark = false,
		positioning = 'fixed',
		isCollapsed: externalCollapsed,
		onCollapsedChange,
		languageItems = [],
		currentLanguageLabel = 'Language',
		showLanguageSwitcher = false,
		showThemeToggle = true,
		primaryColor,
		prependElements = [],
		elements = [],
		startSlot,
		showLogout = true,
		themeVariantItems = [],
		currentThemeVariantLabel = 'Theme',
		showThemeVariants = false,
		showAiTierSelector = false,
		aiTierItems = [],
		currentAiTierLabel = 'KI',
		currentAiTierIcon = 'cpu',
		showSyncStatus = false,
		syncStatusItems = [],
		currentSyncLabel = 'Sync',
		themeMode = 'system',
		onThemeModeChange,
		appItems = [],
		showAppSwitcher = false,
		userEmail,
		profileHref,
		loginHref,
		a11yContrast = 'normal',
		onA11yContrastChange,
		a11yReduceMotion = false,
		onA11yReduceMotionChange,
		showA11yQuickToggles = false,
		onOpenInPanel,
		spotlightActions,
		spotlightPlaceholder,
		contentSearcher,
		ariaLabel,
		feedbackHref = '/feedback',
		onFeedback,
		themesHref,
		spiralHref,
		creditsHref,
		guestMenuLabel = 'Menü',
		helpHref,
		bottomOffset = '0px',
		onOpenBar,
		activeBarId = null,
	}: Props = $props();

	// Whether this nav should surface dropdowns as bars instead of popovers.
	const barMode = $derived(!!onOpenBar);

	// Build the flat PillDropdownItem list for each bar, matching what the
	// equivalent PillDropdown would render. Mode toggles + variants + a11y

	function toggleBar(config: PillBarConfig) {
		if (!onOpenBar) return;
		if (activeBarId === config.id) {
			onOpenBar(null);
		} else {
			onOpenBar(config);
		}
	}

	// Type guards for elements
	function isTabGroup(element: PillNavElement): element is PillTabGroupConfig {
		return 'type' in element && element.type === 'tabs';
	}

	function isDivider(element: PillNavElement): element is { type: 'divider' } {
		return 'type' in element && element.type === 'divider';
	}

	function isTagSelector(element: PillNavElement): element is PillTagSelectorConfig {
		return 'type' in element && element.type === 'tag-selector';
	}

	function isNavItem(element: PillNavElement): element is PillNavItem {
		return 'href' in element;
	}

	// Truncate email for display (show first part before @, max 12 chars)
	function truncateEmail(email: string, maxLength = 12): string {
		const atIndex = email.indexOf('@');
		const localPart = atIndex > 0 ? email.substring(0, atIndex) : email;
		if (localPart.length <= maxLength) {
			return localPart;
		}
		return localPart.substring(0, maxLength) + '…';
	}

	// Dropdown direction: always up since nav is always at bottom
	const dropdownDirection = 'up' as const;

	// App drawer state
	let appDrawerOpen = $state(false);

	// User menu panel state
	let userMenuOpen = $state(false);
	let userMenuTrigger = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);

	// Close user menu on navigation
	$effect(() => {
		currentPath;
		userMenuOpen = false;
	});

	// Account links for UserMenuPanel
	const accountLinks = $derived.by(() => {
		const links: {
			id: string;
			label: string;
			icon: string;
			href?: string;
			onClick?: () => void;
			active?: boolean;
		}[] = [];
		if (userEmail && profileHref) {
			links.push({
				id: 'profile',
				label: 'Profil',
				icon: 'user',
				href: profileHref,
				active: currentPath === profileHref,
			});
		}
		if (spiralHref) {
			links.push({
				id: 'spiral',
				label: 'Spiral',
				icon: 'spiral',
				href: spiralHref,
				active: currentPath === spiralHref,
			});
		}
		if (creditsHref) {
			links.push({
				id: 'credits',
				label: 'Credits',
				icon: 'creditCard',
				href: creditsHref,
				active: currentPath === creditsHref,
			});
		}
		if (userEmail && onFeedback) {
			links.push({
				id: 'feedback',
				label: 'Idee teilen',
				icon: 'heart-half',
				onClick: onFeedback,
			});
		} else if (userEmail && feedbackHref) {
			links.push({
				id: 'feedback',
				label: 'Feedback',
				icon: 'chat',
				href: feedbackHref,
				active: currentPath === feedbackHref,
			});
		}
		if (helpHref) {
			links.push({
				id: 'help',
				label: 'Hilfe',
				icon: 'help',
				href: helpHref,
				active: currentPath === helpHref,
			});
		}
		if (themesHref) {
			links.push({
				id: 'themes',
				label: 'Themes',
				icon: 'palette',
				href: themesHref,
				active: currentPath === themesHref,
			});
		}
		return links;
	});

	// Global spotlight (Cmd+K) — only active when spotlightActions are provided
	// svelte-ignore state_referenced_locally
	const spotlight = spotlightActions ? createGlobalSpotlightState() : null;

	function isActive(path: string) {
		return currentPath === path;
	}

	// User-menu bar — rendered when barMode is active. Short list: settings,
	// light/dark/system toggle, theme button. For guests the "Anmelden"
	// CTA lives as a visible pill in the nav row itself (see below), so
	// we don't duplicate it inside the opened bar.
	const userMenuBarItems = $derived.by<PillDropdownItem[]>(() => {
		const out: PillDropdownItem[] = [];
		if (userEmail && onFeedback) {
			out.push({
				id: 'feedback',
				label: 'Idee teilen',
				icon: 'heart-half',
				onClick: () => onFeedback(),
			});
			out.push({ id: 'feedback-divider', label: '', divider: true });
		}
		if (onThemeModeChange) {
			out.push(
				{
					id: 'mode-light',
					label: 'Hell',
					icon: 'sun',
					group: 'theme-mode',
					active: themeMode === 'light',
					onClick: () => onThemeModeChange('light'),
				},
				{
					id: 'mode-dark',
					label: 'Dunkel',
					icon: 'moon',
					group: 'theme-mode',
					active: themeMode === 'dark',
					onClick: () => onThemeModeChange('dark'),
				},
				{
					id: 'mode-system',
					label: 'System',
					icon: 'settings',
					group: 'theme-mode',
					active: themeMode === 'system',
					onClick: () => onThemeModeChange('system'),
				}
			);
		}
		if (themesHref) {
			out.push({
				id: 'themes',
				label: 'Theme',
				icon: 'palette',
				onClick: () => {
					window.location.href = themesHref;
				},
			});
		}
		// Cloud Sync — only for signed-in users. Folded into the user menu
		// so the top-level pill row stays short; the status line itself
		// (e.g. "Cloud Sync aktiv") is disabled and renders as a section
		// header because PillDropdownBar shows `divider: true, label` as a
		// labelled separator.
		if (userEmail && showSyncStatus && syncStatusItems.length > 0) {
			out.push({ id: 'sync-section', label: 'Sync', divider: true });
			for (const item of syncStatusItems) out.push(item);
		}
		if (onLogout && showLogout && userEmail) {
			out.push({
				id: 'logout',
				label: 'Logout',
				icon: 'logout',
				danger: true,
				onClick: () => onLogout(),
			});
		}
		return out;
	});
</script>

{#if !(externalCollapsed ?? false)}
	<nav
		class="pill-nav"
		class:pill-nav-static={positioning === 'static'}
		style="{primaryColor
			? `--pill-primary-color: ${primaryColor};`
			: ''}--pill-nav-bottom: {bottomOffset}"
		aria-label={ariaLabel}
	>
		<div class="pill-nav-container">
			<!-- Host-provided start slot (e.g. Space switcher). Rendered
				 before the app drawer so it anchors the left edge of the bar. -->
			{#if startSlot}
				{@render startSlot()}
			{/if}

			<!-- App Switcher (optional) -->
			{#if showAppSwitcher && appItems.length > 0}
				<AppDrawer
					apps={appItems}
					isOpen={appDrawerOpen}
					onToggle={(open) => (appDrawerOpen = open)}
					{onOpenInPanel}
					triggerLabel={appName}
				/>
			{/if}

			<!-- Prepended Elements (Tab Groups, Dividers, Nav Items, Tag Selectors) -->
			{#each prependElements as element}
				{#if isTabGroup(element)}
					<PillTabGroup
						options={element.options}
						value={element.value}
						onChange={element.onChange}
						sectionLabel={element.sectionLabel}
						onContextMenu={element.onContextMenu}
						{primaryColor}
					/>
				{:else if isDivider(element)}
					<div class="pill-divider"></div>
				{:else if isTagSelector(element)}
					<PillTagSelector
						tags={element.tags}
						selectedIds={element.selectedIds}
						onToggle={element.onToggle}
						onClear={element.onClear}
						onCreate={element.onCreate}
						loading={element.loading}
						label={element.label}
						direction={dropdownDirection}
					/>
				{:else if isNavItem(element)}
					<Pill
						size="sm"
						href={element.href}
						icon={element.icon}
						label={element.label}
						active={isActive(element.href)}
					/>
				{/if}
			{/each}

			<!-- Navigation Items -->
			{#each items as item}
				{@const standardIcon =
					item.icon && item.icon !== 'mana' && !item.iconSvg ? item.icon : undefined}
				<Pill
					size="sm"
					href={item.onClick ? undefined : item.href}
					onclick={item.onClick}
					oncontextmenu={item.onContextMenu}
					icon={standardIcon}
					label={item.label}
					iconOnly={item.iconOnly}
					active={item.onClick ? item.active : isActive(item.href)}
				>
					{#snippet leading()}
						{#if item.icon === 'mana'}
							<ManaLogoIcon size={18} class="pill-icon" />
						{:else if item.iconSvg}
							{@html item.iconSvg}
						{/if}
					{/snippet}
				</Pill>
			{/each}

			<!-- Additional Elements (Tab Groups, Dividers, Tag Selectors) -->
			{#each elements as element}
				{#if isTabGroup(element)}
					<PillTabGroup
						options={element.options}
						value={element.value}
						onChange={element.onChange}
						sectionLabel={element.sectionLabel}
						onContextMenu={element.onContextMenu}
						{primaryColor}
					/>
				{:else if isDivider(element)}
					<div class="pill-divider"></div>
				{:else if isTagSelector(element)}
					<PillTagSelector
						tags={element.tags}
						selectedIds={element.selectedIds}
						onToggle={element.onToggle}
						onClear={element.onClear}
						onCreate={element.onCreate}
						loading={element.loading}
						label={element.label}
						direction={dropdownDirection}
					/>
				{:else if isNavItem(element)}
					<Pill
						size="sm"
						href={element.href}
						icon={element.icon}
						label={element.label}
						active={isActive(element.href)}
					/>
				{/if}
			{/each}

			<!-- Sync status lives inside the user menu now (see
				 userMenuBarItems). We used to render a standalone cloud pill
				 here but it pushed the nav to 5+ pills on mobile while
				 duplicating items the user menu panel already shows for
				 settings / account. Folding into the user menu keeps the
				 top-level row short and gives sync a real section header. -->

			<!-- User Menu -->
			{#if (userEmail || loginHref) && barMode}
				{@const userLabel = userEmail ? truncateEmail(userEmail) : guestMenuLabel}
				<!-- For guests we omit the bar header label: the first item in
					 userMenuBarItems is the "Anmelden" call-to-action, and a
					 decorative "Menü" pill sitting to its left just clutters
					 the bar without adding information. -->
				{@const userBarConfig = {
					id: 'user',
					label: userEmail ? userLabel : '',
					icon: userEmail ? 'user' : undefined,
					items: userMenuBarItems,
				}}
				<Pill
					size="sm"
					icon="user"
					iconOnly
					label={userLabel}
					active={activeBarId === 'user'}
					onclick={() => toggleBar(userBarConfig)}
					data={{ 'data-user-menu-trigger': '' }}
				/>
			{:else if userEmail || loginHref}
				{@const userLabel = userEmail ? truncateEmail(userEmail) : guestMenuLabel}
				<Pill
					size="sm"
					icon="user"
					iconOnly
					label={userLabel}
					active={userMenuOpen}
					onclick={() => (userMenuOpen = !userMenuOpen)}
					bind:element={userMenuTrigger}
					data={{ 'data-user-menu-trigger': '' }}
				/>
			{:else if onLogout && showLogout}
				<Pill size="sm" icon="logout" label="Logout" danger onclick={onLogout} title="Logout" />
			{/if}

			<!-- Guest CTA: visible "Anmelden" pill right next to the user
				 menu icon, so signing in doesn't require opening the menu
				 first. Kept out of the menu's bar to avoid duplication. -->
			{#if !userEmail && loginHref}
				<Pill size="sm" href={loginHref} icon="login" label="Anmelden" primary />
			{/if}
		</div>
	</nav>
{/if}

<!-- User Menu Panel (overlay) -->
{#if userMenuOpen}
	<UserMenuPanel
		{userEmail}
		{loginHref}
		{accountLinks}
		showLogout={showLogout && !!userEmail}
		{onLogout}
		showAiTier={showAiTierSelector && aiTierItems.length > 0}
		{aiTierItems}
		{themeMode}
		{onThemeModeChange}
		{themeVariantItems}
		{showA11yQuickToggles}
		{a11yContrast}
		{onA11yContrastChange}
		{a11yReduceMotion}
		{onA11yReduceMotionChange}
		showLanguageSwitcher={showLanguageSwitcher && languageItems.length > 0}
		{languageItems}
		onClose={() => (userMenuOpen = false)}
		triggerElement={userMenuTrigger ?? undefined}
	/>
{/if}

<!-- Global Spotlight (Cmd+K) -->
{#if spotlight && spotlightActions}
	<GlobalSpotlight
		open={spotlight.isOpen}
		onClose={spotlight.close}
		apps={appItems}
		quickActions={spotlightActions}
		placeholder={spotlightPlaceholder}
		{contentSearcher}
	/>
{/if}

<style>
	.pill-nav {
		position: fixed;
		bottom: var(--pill-nav-bottom, 0px);
		left: 0;
		right: 0;
		z-index: 1000;
		/* Unified bar height (see bottomChromeHeight in (app)/+layout.svelte). */
		height: calc(56px + env(safe-area-inset-bottom, 0px));
		padding-bottom: env(safe-area-inset-bottom, 0px);
		display: flex;
		align-items: center;
		pointer-events: none;
		/* Container query context */
		container-type: inline-size;
		container-name: pillnav;
	}

	.pill-nav-static {
		position: relative;
		bottom: auto;
		z-index: auto;
	}

	.pill-nav-container {
		display: flex;
		align-items: center;
		gap: 1rem;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		pointer-events: auto;
		padding: 0.5rem 2rem;
		/* Default: left-aligned with fit-content */
		width: fit-content;
		max-width: 100%;
	}

	/* Center when container has enough space (> 600px) */
	@container pillnav (min-width: 600px) {
		.pill-nav-container {
			margin-left: auto;
			margin-right: auto;
		}
	}

	.pill-nav-container::-webkit-scrollbar {
		display: none;
	}

	/* Mobile: tighter padding, icon-only pills */
	@media (max-width: 640px) {
		.pill-nav-container {
			padding: 0.375rem 0.75rem;
			gap: 0.5rem;
		}
	}

	/* Divider */
	.pill-divider {
		width: 1px;
		height: 1.5rem;
		background: rgba(0, 0, 0, 0.15);
		flex-shrink: 0;
		margin: 0 0.25rem;
	}

	:global(.dark) .pill-divider {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Progress ring on pill (used for download indicator).
	   Uses a conic-gradient border trick so it follows the pill's
	   own border-radius regardless of shape. */
	/* Transitions */
	.pill-nav {
		transition: all 0.3s ease;
	}

	.pill-nav-container {
		transition: all 0.3s ease;
	}

	/* Theme mode selector in dropdown header */
	:global(.theme-mode-selector) {
		display: flex !important;
		align-items: center !important;
		gap: 0.25rem !important;
		padding: 0.25rem !important;
		border-radius: 9999px !important;
		background: hsl(var(--color-surface)) !important;
		border: 1px solid hsl(var(--color-border)) !important;
		color: hsl(var(--color-foreground)) !important;
	}

	:global(.mode-btn) {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		border: none;
		background: transparent;
		border-radius: 9999px;
		cursor: pointer;
		color: hsl(var(--color-foreground));
		transition:
			background-color 150ms,
			color 150ms;
		font-family: inherit;
	}

	:global(.mode-btn:hover:not(.active)) {
		background: hsl(var(--color-surface-hover));
	}

	:global(.mode-btn.active) {
		background: hsl(var(--color-primary) / 0.2);
		color: hsl(var(--color-primary));
	}

	:global(.mode-icon) {
		width: 1rem;
		height: 1rem;
	}

	/* A11y quick toggles in dropdown footer */
	:global(.a11y-quick-toggles) {
		display: flex !important;
		align-items: center !important;
		gap: 0.25rem !important;
		padding: 0.25rem !important;
		border-radius: 9999px !important;
		background: hsl(var(--color-surface)) !important;
		border: 1px solid hsl(var(--color-border)) !important;
		color: hsl(var(--color-foreground)) !important;
	}

	:global(.a11y-btn) {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		border: none;
		background: transparent;
		border-radius: 9999px;
		cursor: pointer;
		color: hsl(var(--color-muted-foreground));
		transition:
			background-color 150ms,
			color 150ms;
		font-family: inherit;
	}

	:global(.a11y-btn:hover:not(.active)) {
		background: hsl(var(--color-surface-hover));
		color: hsl(var(--color-foreground));
	}

	:global(.a11y-btn.active) {
		background: hsl(var(--color-primary) / 0.2);
		color: hsl(var(--color-primary));
	}

	:global(.a11y-icon) {
		width: 1rem;
		height: 1rem;
	}
</style>
