<script lang="ts">
	import type { PillDropdownItem } from './types';
	import {
		ChatCircle,
		Clock,
		Cloud,
		CreditCard,
		Gear,
		Globe,
		Heart,
		HeartHalf,
		Moon,
		Palette,
		Question,
		Robot,
		SignOut,
		Sparkle,
		Spiral,
		Sun,
		User,
	} from '@mana/shared-icons';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const icons: Record<string, any> = {
		user: User,
		settings: Gear,
		sparkle: Sparkle,
		spiral: Spiral,
		creditCard: CreditCard,
		chat: ChatCircle,
		help: Question,
		heart: Heart,
		clock: Clock,
		globe: Globe,
		cloud: Cloud,
		moon: Moon,
		sun: Sun,
		palette: Palette,
		robot: Robot,
		'heart-half': HeartHalf,
		logout: SignOut,
	};

	interface AccountLink {
		id: string;
		label: string;
		icon: string;
		href?: string;
		onClick?: () => void;
		active?: boolean;
	}

	interface Props {
		// Account
		userEmail?: string;
		loginHref?: string;
		accountLinks?: AccountLink[];
		showLogout?: boolean;
		onLogout?: () => void;

		// AI tier
		showAiTier?: boolean;
		aiTierItems?: PillDropdownItem[];

		// Theme
		themeMode?: 'light' | 'dark' | 'system';
		onThemeModeChange?: (mode: 'light' | 'dark' | 'system') => void;
		themeVariantItems?: PillDropdownItem[];

		// A11y
		showA11yQuickToggles?: boolean;
		a11yContrast?: 'normal' | 'high';
		onA11yContrastChange?: (v: 'normal' | 'high') => void;
		a11yReduceMotion?: boolean;
		onA11yReduceMotionChange?: (v: boolean) => void;

		// Language
		showLanguageSwitcher?: boolean;
		languageItems?: PillDropdownItem[];

		// Panel
		onClose: () => void;
		triggerElement?: HTMLElement;
	}

	let {
		userEmail,
		loginHref,
		accountLinks = [],
		showLogout = false,
		onLogout,
		showAiTier = false,
		aiTierItems = [],
		themeMode = 'system',
		onThemeModeChange,
		themeVariantItems = [],
		showA11yQuickToggles = false,
		a11yContrast = 'normal',
		onA11yContrastChange,
		a11yReduceMotion = false,
		onA11yReduceMotionChange,
		showLanguageSwitcher = false,
		languageItems = [],
		onClose,
		triggerElement,
	}: Props = $props();

	let panelBottom = $state(0);

	$effect(() => {
		if (triggerElement) {
			const rect = triggerElement.getBoundingClientRect();
			panelBottom = window.innerHeight - rect.top + 8;
		}
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleItemClick(item: PillDropdownItem, event: MouseEvent) {
		if (item.disabled) return;
		item.onClick?.(event);
	}

	function navigateTo(href: string) {
		window.location.href = href;
		onClose();
	}

	// Split AI items into LLM, STT, and extra sections by dividers
	const aiSections = $derived.by(() => {
		const llm: PillDropdownItem[] = [];
		const stt: PillDropdownItem[] = [];
		const extra: PillDropdownItem[] = [];
		let section: 'llm' | 'stt' | 'extra' = 'llm';
		for (const item of aiTierItems) {
			if (item.divider && item.id === 'stt-divider') {
				section = 'stt';
				continue;
			}
			if (item.divider && item.id === 'ai-divider') {
				section = 'extra';
				continue;
			}
			if (item.divider) continue;
			if (section === 'llm') llm.push(item);
			else if (section === 'stt') stt.push(item);
			else extra.push(item);
		}
		return { llm, stt, extra };
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_interactive_supports_focus -->
<div
	class="user-menu-panel-root"
	onkeydown={handleKeydown}
	role="dialog"
	aria-label="Menu"
	tabindex="-1"
>
	<!-- Backdrop -->
	<button class="panel-backdrop" onclick={onClose} aria-label="Menü schließen"></button>

	<!-- Panel -->
	<div class="panel" style="bottom: {panelBottom}px;">
		<!-- Header -->
		{#if userEmail}
			<div class="panel-header">
				<User size={18} />
				<span class="header-email">{userEmail}</span>
			</div>
		{/if}

		<div class="panel-content">
			<!-- Account Links -->
			{#if accountLinks.length > 0}
				<div class="panel-section">
					<div class="section-header">Account</div>
					<div class="chip-grid">
						{#each accountLinks as link (link.id)}
							<button
								class="chip"
								class:active={link.active}
								onclick={() => {
									if (link.onClick) {
										link.onClick();
										onClose();
									} else if (link.href) {
										navigateTo(link.href);
									}
								}}
								title={link.label}
							>
								{#if icons[link.icon]}
									{@const Icon = icons[link.icon]}
									<Icon size={16} />
								{/if}
								<span>{link.label}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- AI Tier -->
			{#if showAiTier && aiTierItems.length > 0}
				<div class="panel-section">
					<div class="section-header">Künstliche Intelligenz</div>

					<!-- LLM subsection -->
					{#if aiSections.llm.length > 0}
						<div class="subsection">
							<div class="subsection-header">Textgenerierung</div>
							<div class="chip-grid">
								{#each aiSections.llm as item (item.id)}
									<button
										class="chip"
										class:active={item.active}
										disabled={item.disabled}
										onclick={(e) => handleItemClick(item, e)}
										title={item.label}
									>
										{#if item.progress != null}
											<svg class="progress-ring" viewBox="0 0 20 20">
												<circle class="progress-bg" cx="10" cy="10" r="8" />
												<circle
													class="progress-fill"
													cx="10"
													cy="10"
													r="8"
													stroke-dasharray={8 * 2 * Math.PI}
													stroke-dashoffset={8 * 2 * Math.PI * (1 - item.progress)}
												/>
											</svg>
										{:else if item.icon && icons[item.icon]}
											{@const Icon = icons[item.icon]}
											<Icon size={16} />
										{/if}
										<span>{item.label}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Whisper subsection -->
					{#if aiSections.stt.length > 0}
						<div class="subsection">
							<div class="subsection-header">Spracherkennung</div>
							<div class="chip-grid">
								{#each aiSections.stt as item (item.id)}
									<button
										class="chip"
										class:active={item.active}
										disabled={item.disabled}
										onclick={(e) => handleItemClick(item, e)}
										title={item.label}
									>
										{#if item.progress != null}
											<svg class="progress-ring" viewBox="0 0 20 20">
												<circle class="progress-bg" cx="10" cy="10" r="8" />
												<circle
													class="progress-fill"
													cx="10"
													cy="10"
													r="8"
													stroke-dasharray={8 * 2 * Math.PI}
													stroke-dashoffset={8 * 2 * Math.PI * (1 - item.progress)}
												/>
											</svg>
										{:else if item.icon && icons[item.icon]}
											{@const Icon = icons[item.icon]}
											<Icon size={16} />
										{/if}
										<span>{item.label}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Extra (e.g. KI-Einstellungen link) -->
					{#if aiSections.extra.length > 0}
						<div class="chip-grid" style="margin-top: 0.5rem;">
							{#each aiSections.extra as item (item.id)}
								<button
									class="chip"
									class:active={item.active}
									disabled={item.disabled}
									onclick={(e) => handleItemClick(item, e)}
									title={item.label}
								>
									{#if item.icon && icons[item.icon]}
										{@const Icon = icons[item.icon]}
										<Icon size={16} />
									{/if}
									<span>{item.label}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Theme -->
			{#if onThemeModeChange || themeVariantItems.length > 0}
				<div class="panel-section">
					<div class="section-header">Theme</div>
					{#if onThemeModeChange}
						<div class="segmented-toggle">
							<button
								class="segmented-btn"
								class:active={themeMode === 'light'}
								onclick={() => onThemeModeChange('light')}
								title="Light"
							>
								<Sun size={16} />
								<span>Light</span>
							</button>
							<button
								class="segmented-btn"
								class:active={themeMode === 'dark'}
								onclick={() => onThemeModeChange('dark')}
								title="Dark"
							>
								<Moon size={16} />
								<span>Dark</span>
							</button>
							<button
								class="segmented-btn"
								class:active={themeMode === 'system'}
								onclick={() => onThemeModeChange('system')}
								title="System"
							>
								<Gear size={16} />
								<span>Auto</span>
							</button>
						</div>
					{/if}
					{#if themeVariantItems.length > 0}
						<div class="chip-grid" style="margin-top: 0.5rem;">
							{#each themeVariantItems as item (item.id)}
								<button
									class="chip"
									class:active={item.active}
									disabled={item.disabled}
									onclick={(e) => handleItemClick(item, e)}
									title={item.label}
								>
									{#if item.imageUrl}
										<img src={item.imageUrl} alt="" class="chip-img" />
									{:else if item.icon && icons[item.icon]}
										{@const Icon = icons[item.icon]}
										<Icon size={16} />
									{/if}
									<span>{item.label}</span>
								</button>
							{/each}
						</div>
					{/if}
					{#if showA11yQuickToggles}
						<div class="a11y-row" style="margin-top: 0.5rem;">
							{#if onA11yContrastChange}
								<button
									class="chip"
									class:active={a11yContrast === 'high'}
									onclick={() => onA11yContrastChange(a11yContrast === 'high' ? 'normal' : 'high')}
								>
									<Sun size={16} />
									<span>Kontrast</span>
								</button>
							{/if}
							{#if onA11yReduceMotionChange}
								<button
									class="chip"
									class:active={a11yReduceMotion}
									onclick={() => onA11yReduceMotionChange(!a11yReduceMotion)}
								>
									<Gear size={16} />
									<span>Weniger Animationen</span>
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Language -->
			{#if showLanguageSwitcher && languageItems.length > 0}
				<div class="panel-section">
					<div class="section-header">Sprache</div>
					<div class="segmented-toggle">
						{#each languageItems as item (item.id)}
							<button
								class="segmented-btn"
								class:active={item.active}
								onclick={(e) => handleItemClick(item, e)}
								title={item.label}
							>
								<span>{item.label}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer: Login / Logout -->
		{#if !userEmail && loginHref}
			<div class="panel-footer">
				<button class="login-btn" onclick={() => navigateTo(loginHref)}>
					<User size={16} />
					<span>Anmelden</span>
				</button>
			</div>
		{:else if userEmail && showLogout && onLogout}
			<div class="panel-footer">
				<button
					class="logout-btn"
					onclick={() => {
						onLogout();
						onClose();
					}}
				>
					<SignOut size={16} />
					<span>Logout</span>
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.user-menu-panel-root {
		position: relative;
		z-index: 10000;
	}

	/* Backdrop */
	.panel-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9998;
		background: rgba(0, 0, 0, 0.1);
		border: none;
		cursor: default;
	}

	:global(.dark) .panel-backdrop {
		background: rgba(0, 0, 0, 0.3);
	}

	/* Panel */
	.panel {
		position: fixed;
		z-index: 9999;
		width: 520px;
		max-height: 85vh;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 1rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.15),
			0 8px 10px -6px rgba(0, 0, 0, 0.1);
		animation: panelIn 0.15s ease-out;
		overflow: hidden;
	}

	@keyframes panelIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	/* Header */
	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid hsl(var(--color-border));
		font-size: 0.8125rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
	}

	.header-email {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Content */
	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	/* Sections */
	.panel-section {
		padding: 0.375rem 0.5rem;
	}

	.panel-section + .panel-section {
		border-top: 1px solid hsl(var(--color-border));
		margin-top: 0.25rem;
		padding-top: 0.625rem;
	}

	.section-header {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: hsl(var(--color-muted-foreground));
		padding-bottom: 0.375rem;
	}

	.subsection {
		margin-top: 0.375rem;
	}

	.subsection:first-child {
		margin-top: 0;
	}

	.subsection-header {
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		color: hsl(var(--color-muted-foreground));
		opacity: 0.7;
		padding-bottom: 0.25rem;
	}

	/* Chip grid */
	.chip-grid,
	.a11y-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		border-radius: 9999px;
		border: 1px solid hsl(var(--color-border));
		background: hsl(var(--color-surface));
		font-size: 0.8125rem;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.15s;
		color: hsl(var(--color-foreground));
	}

	.chip:hover:not(:disabled) {
		background: hsl(var(--color-surface-hover));
	}

	.chip:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.chip.active {
		background: hsl(var(--color-primary) / 0.18);
		border-color: hsl(var(--color-primary) / 0.4);
		color: hsl(var(--color-primary));
	}

	.chip-img {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		object-fit: cover;
	}

	/* Segmented toggle */
	.segmented-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: 9999px;
		border: 1px solid hsl(var(--color-border));
		background: hsl(var(--color-surface));
		box-shadow:
			0 1px 2px hsl(0 0% 0% / 0.05),
			0 2px 6px hsl(0 0% 0% / 0.04);
	}

	.segmented-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		border: none;
		background: transparent;
		border-radius: 9999px;
		cursor: pointer;
		font-size: 0.8125rem;
		font-weight: 500;
		color: hsl(var(--color-foreground));
		transition: all 0.15s;
		white-space: nowrap;
	}

	.segmented-btn:hover:not(.active):not(:disabled) {
		background: hsl(var(--color-surface-hover));
	}

	.segmented-btn.active {
		background: hsl(var(--color-primary) / 0.2);
		color: hsl(var(--color-primary));
	}

	.segmented-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Progress ring */
	.progress-ring {
		width: 20px;
		height: 20px;
		transform: rotate(-90deg);
		flex-shrink: 0;
	}

	.progress-bg {
		fill: none;
		stroke: hsl(var(--color-border));
		stroke-width: 2;
	}

	.progress-fill {
		fill: none;
		stroke: hsl(var(--color-primary));
		stroke-width: 2.5;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.3s ease;
	}

	/* Login button */
	.login-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.875rem;
		border-radius: 9999px;
		border: none;
		background: hsl(var(--color-primary));
		color: hsl(var(--color-primary-foreground));
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
		justify-content: center;
	}

	.login-btn:hover {
		opacity: 0.9;
	}

	/* Footer */
	.panel-footer {
		border-top: 1px solid hsl(var(--color-border));
		padding: 0.5rem;
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.875rem;
		border-radius: 9999px;
		border: 1px solid hsl(var(--color-border));
		background: hsl(var(--color-surface));
		color: hsl(var(--color-error));
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 150ms,
			color 150ms;
		justify-content: center;
		font-family: inherit;
	}

	.logout-btn:hover {
		background: hsl(var(--color-surface-hover));
	}

	/* Mobile: bottom sheet */
	@media (max-width: 640px) {
		.panel {
			position: fixed;
			top: auto !important;
			left: 0 !important;
			right: 0 !important;
			bottom: 0 !important;
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

		.panel-backdrop {
			background: rgba(0, 0, 0, 0.3);
		}
	}
</style>
