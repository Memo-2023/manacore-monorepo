<!--
  ModuleShell — Canonical card shell for every Mana module surface.

  Replaces the old PageShell + AppPage split. A single component serves
  both rendering paths:

    variant="card"  — width-sized, sits in a PageCarousel next to siblings.
                      Window actions (close / move / resize / maximize)
                      belong here. This is what the homepage and the
                      legacy per-module carousels (e.g. /todo) use.

    variant="fill"  — fills the main content area. Sub-routes
                      (/picture, /picture/generate, …) use
                      this. Back-button replaces the close button when
                      a backHref is provided. No carousel window
                      actions.

  Visual chrome (paper-texture, soft border, rounded corners, shadow,
  header bar) is identical across both variants so the homepage and
  sub-routes read as the same system.
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import {
		X,
		CornersOut,
		CornersIn,
		CaretLeft,
		CaretRight,
		ArrowsOutLineHorizontal,
		ArrowLeft,
		Question,
	} from '@mana/shared-icons';
	import type { Snippet, Component } from 'svelte';
	import { PAGE_WIDTH_PRESETS, nearestPresetIndex } from '../page-carousel/width-presets';
	import FeedbackHook from '$lib/components/feedback/FeedbackHook.svelte';

	interface Props {
		// Layout mode
		variant?: 'card' | 'fill';
		/** Required for variant="card" unless maximized. */
		widthPx?: number;
		maximized?: boolean;

		// Header content
		title?: string;
		titleHref?: string;
		color?: string;
		icon?: Component;

		// Card-mode actions (carousel window chrome)
		onClose?: () => void;
		onMaximize?: () => void;
		onResize?: (widthPx: number) => void;
		onMoveLeft?: () => void;
		onMoveRight?: () => void;

		// Fill-mode actions (route navigation)
		/** If provided, renders a back arrow in the header that navigates to this URL. */
		backHref?: string;
		/** Custom back handler. Takes precedence over backHref — use for history.back() or custom logic. */
		onBack?: () => void;

		// Shared
		onHelp?: () => void;
		helpOpen?: boolean;
		onContextMenu?: (e: MouseEvent) => void;

		// Inline feedback hook — renders a small heart-half button in the
		// window-actions row. Submitted feedback is tagged with `moduleId`
		// so the public community feed can group/filter by module.
		/** Module identifier passed to the inline FeedbackHook. */
		moduleId?: string;
		/** Suppress the auto-injected FeedbackHook (e.g. on the
		 *  /feedback-page where it's redundant). */
		hideFeedback?: boolean;
		/** When provided, the heart-half button calls this instead of
		 *  opening its own modal. The host renders feedback inline (used
		 *  by workbench AppPage to mirror the Hilfe-panel pattern). */
		onFeedback?: () => void;
		/** Highlights the heart-half trigger when the inline panel is open. */
		feedbackOpen?: boolean;

		// Snippets
		header_left?: Snippet;
		badge?: Snippet;
		/** Renders to the right of the title, before the window actions.
		 *  Use for view-specific controls (e.g. credit badge on /picture/generate). */
		actions?: Snippet;
		toolbar?: Snippet;
		children: Snippet;
	}

	let {
		variant = 'card',
		widthPx,
		maximized = false,
		title = '',
		titleHref,
		color = '#6B7280',
		icon: IconComponent,
		onClose,
		onMaximize,
		onResize,
		onMoveLeft,
		onMoveRight,
		backHref,
		onBack,
		onHelp,
		helpOpen = false,
		onContextMenu,
		moduleId,
		hideFeedback = false,
		onFeedback,
		feedbackOpen = false,
		header_left,
		badge,
		actions,
		toolbar,
		children,
	}: Props = $props();

	// Escape exits maximized mode
	onMount(() => {
		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && maximized && onMaximize) {
				e.preventDefault();
				e.stopPropagation();
				onMaximize();
			}
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	let widthMenuOpen = $state(false);
	let widthBtnEl = $state<HTMLButtonElement | null>(null);

	const activePresetIdx = $derived(typeof widthPx === 'number' ? nearestPresetIndex(widthPx) : 0);

	function selectWidth(px: number) {
		widthMenuOpen = false;
		onResize?.(px);
	}

	function handleWidthBtnKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && widthMenuOpen) {
			e.preventDefault();
			widthMenuOpen = false;
			widthBtnEl?.focus();
		}
	}

	// ── Derived layout style ────────────────────────────────
	// Card: width is whatever the carousel drag-resizes it to.
	// Fill: width is 100% of the main container; layout's max-w-7xl caps it.
	const widthStyle = $derived(
		variant === 'card' ? `width: ${maximized ? '100%' : `${widthPx ?? 480}px`};` : 'width: 100%;'
	);

	const showCardActions = $derived(variant === 'card');
	const showBackButton = $derived(variant === 'fill' && (backHref || onBack));
</script>

<div class="module-shell" class:maximized class:fill={variant === 'fill'} style={widthStyle}>
	<!-- Header with window actions / back button -->
	<div class="shell-header" oncontextmenu={onContextMenu} role="banner">
		<div class="header-left">
			{#if showBackButton}
				{#if onBack}
					<button class="back-btn" onclick={onBack} title="Zurück">
						<ArrowLeft size={16} weight="bold" />
					</button>
				{:else if backHref}
					<a class="back-btn" href={backHref} title="Zurück">
						<ArrowLeft size={16} weight="bold" />
					</a>
				{/if}
			{/if}
			{#if header_left}
				{@render header_left()}
			{:else}
				{#if IconComponent}
					<span class="header-icon">
						<IconComponent size={28} weight="bold" />
					</span>
				{:else}
					<span class="color-dot" style="background-color: {color}"></span>
				{/if}
				{#if titleHref}
					<a
						class="shell-title shell-title-link"
						href={titleHref}
						target="_blank"
						rel="noopener noreferrer"
						onclick={(e) => e.stopPropagation()}
						title={`${title} in neuem Tab öffnen`}
					>
						{title}
					</a>
				{:else}
					<span class="shell-title">{title}</span>
				{/if}
			{/if}
			{#if badge}
				{@render badge()}
			{/if}
		</div>

		<div class="window-actions">
			{#if actions}
				{@render actions()}
			{/if}
			{#if !hideFeedback}
				<FeedbackHook {moduleId} onClick={onFeedback} active={feedbackOpen} />
			{/if}
			{#if onHelp}
				<button
					class="window-btn"
					class:window-btn-active={helpOpen}
					onclick={(e) => {
						e.stopPropagation();
						onHelp();
					}}
					title="Info"
				>
					<Question size={22} weight="bold" />
				</button>
			{/if}
			{#if showCardActions && onMoveLeft}
				<button
					class="window-btn"
					onclick={(e) => {
						e.stopPropagation();
						onMoveLeft();
					}}
					title="Nach links"
				>
					<CaretLeft size={24} weight="bold" />
				</button>
			{/if}
			{#if showCardActions && onMoveRight}
				<button
					class="window-btn"
					onclick={(e) => {
						e.stopPropagation();
						onMoveRight();
					}}
					title="Nach rechts"
				>
					<CaretRight size={24} weight="bold" />
				</button>
			{/if}
			{#if showCardActions && onResize && !maximized}
				<div class="width-picker-wrapper">
					<button
						bind:this={widthBtnEl}
						class="window-btn"
						onclick={(e) => {
							e.stopPropagation();
							widthMenuOpen = !widthMenuOpen;
						}}
						onkeydown={handleWidthBtnKey}
						aria-haspopup="menu"
						aria-expanded={widthMenuOpen}
						title="Breite ändern"
					>
						<ArrowsOutLineHorizontal size={22} weight="bold" />
					</button>
					{#if widthMenuOpen}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="width-menu-backdrop" onclick={() => (widthMenuOpen = false)}></div>
						<div class="width-menu" role="menu">
							{#each PAGE_WIDTH_PRESETS as preset, idx (preset.widthPx)}
								<button
									class="width-opt"
									class:active={idx === activePresetIdx}
									role="menuitemradio"
									aria-checked={idx === activePresetIdx}
									title={preset.description}
									onclick={(e) => {
										e.stopPropagation();
										selectWidth(preset.widthPx);
									}}
								>
									<span class="width-opt-label">{preset.label}</span>
									<span class="width-opt-px">{preset.widthPx}px</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			{#if onMaximize}
				<button
					class="window-btn"
					onclick={(e) => {
						e.stopPropagation();
						onMaximize();
					}}
					title={maximized ? 'Verkleinern' : 'Maximieren'}
				>
					{#if maximized}<CornersIn size={24} weight="bold" />{:else}<CornersOut
							size={24}
							weight="bold"
						/>{/if}
				</button>
			{/if}
			{#if showCardActions && onClose}
				<button
					class="window-btn window-btn-close"
					onclick={(e) => {
						e.stopPropagation();
						onClose();
					}}
					title={$_('common.close')}
				>
					<X size={24} weight="bold" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Optional toolbar (e.g. PageEditBar) -->
	{#if toolbar}
		{@render toolbar()}
	{/if}

	<!-- Body -->
	<div class="shell-body">
		{@render children()}
	</div>
</div>

<style>
	/* Paper card: active-theme-aware texture applied via background-blend-mode.
	   CSS vars come from applyThemeToDocument() in @mana/shared-theme.
	   See git log of PageShell.svelte for the blend-mode rationale — the
	   ::before overlay pattern failed in dark mode due to stacking-context
	   quirks. */
	.module-shell {
		flex: 0 0 auto;
		/* Height calc uses layout-supplied CSS vars (--bottom-chrome-height,
		   --workbench-reserved-y) from routes/(app)/+layout.svelte's <main>. */
		height: calc(100dvh - var(--bottom-chrome-height, 80px) - var(--workbench-reserved-y, 2.5rem));
		min-height: 320px;
		max-width: calc(100vw - 2rem);
		background-color: hsl(var(--color-card));
		background-image: var(--paper-texture, none);
		background-size: var(--paper-size, 240px 240px);
		background-repeat: repeat;
		background-blend-mode: var(--paper-blend-mode, multiply);
		border: 2px solid hsl(0 0% 0% / 0.12);
		border-radius: 1.25rem;
		box-shadow:
			0 8px 24px hsl(0 0% 0% / 0.12),
			0 3px 8px hsl(0 0% 0% / 0.08);
		display: flex;
		flex-direction: column;
		animation: fadeIn 0.25s ease-out;
		overflow: hidden;
		position: relative;
	}
	/* Fill variant: no fade-in-from-side (that was a carousel affordance),
	   and max-width drops since the layout already caps at max-w-7xl. */
	.module-shell.fill {
		animation: fadeIn 0.2s ease-out;
		max-width: none;
	}
	/* Dark-mode border needs more alpha to stay visible against the
	   dark card background. */
	:global(.dark) .module-shell {
		border-color: hsl(0 0% 0% / 0.28);
	}
	@media (prefers-contrast: more) {
		.module-shell {
			background-image: none;
		}
	}
	.module-shell.maximized {
		position: fixed;
		inset: 0;
		z-index: 95;
		width: 100% !important;
		max-width: none;
		height: 100dvh !important;
		min-height: 100dvh;
		border-radius: 0;
		border: none;
		box-shadow: none;
		animation: fadeInScale 0.2s ease-out;
	}
	@keyframes fadeInScale {
		from {
			opacity: 0.8;
			transform: scale(0.97);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	/* Fill variant enters from below, not from the side. */
	.module-shell.fill {
		animation-name: fadeInUp;
	}
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Header */
	.shell-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
	}
	.header-left {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
	}
	.back-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: hsl(var(--color-muted-foreground));
		cursor: pointer;
		transition: all 0.15s;
		text-decoration: none;
		flex-shrink: 0;
	}
	.back-btn:hover {
		background: hsl(var(--color-surface-hover, var(--color-muted)));
		color: hsl(var(--color-foreground));
	}
	.header-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		color: hsl(var(--color-foreground));
	}
	.color-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}
	.shell-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: hsl(var(--color-foreground));
		transform: translateY(1px);
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	a.shell-title-link {
		text-decoration: none;
		cursor: pointer;
		transition: color 0.15s;
	}
	a.shell-title-link:hover {
		color: hsl(var(--color-primary));
		text-decoration: underline;
	}

	.window-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}
	.window-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: hsl(var(--color-muted-foreground));
		cursor: pointer;
		transition: all 0.15s;
	}
	.window-btn:hover {
		background: hsl(var(--color-surface-hover, var(--color-muted)));
		color: hsl(var(--color-foreground));
	}
	.window-btn-close:hover {
		background: hsl(var(--color-error) / 0.15);
		color: hsl(var(--color-error));
	}
	.window-btn-active {
		background: hsl(var(--color-primary) / 0.12);
		color: hsl(var(--color-primary));
	}

	/* Body */
	.shell-body {
		flex: 1;
		overflow-y: auto;
		min-height: 200px;
	}
	.maximized .shell-header {
		max-width: 48rem;
		margin-inline: auto;
		width: 100%;
	}
	.maximized .shell-body {
		max-width: 48rem;
		margin-inline: auto;
		width: 100%;
	}

	/* Width picker */
	.width-picker-wrapper {
		position: relative;
		display: inline-flex;
	}
	.width-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: transparent;
	}
	.width-menu {
		position: absolute;
		top: calc(100% + 0.375rem);
		right: 0;
		z-index: 60;
		display: flex;
		flex-direction: column;
		min-width: 10rem;
		padding: 0.25rem;
		border-radius: 0.5rem;
		background: hsl(var(--color-card));
		border: 1px solid hsl(var(--color-border));
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
	}
	.width-opt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.625rem;
		border: none;
		background: transparent;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		color: hsl(var(--color-foreground));
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
	}
	.width-opt:hover {
		background: hsl(var(--color-surface-hover, var(--color-muted)));
	}
	.width-opt.active {
		background: hsl(var(--color-primary) / 0.12);
		color: hsl(var(--color-primary));
	}
	.width-opt-label {
		font-weight: 600;
	}
	.width-opt-px {
		font-variant-numeric: tabular-nums;
		font-size: 0.6875rem;
		color: hsl(var(--color-muted-foreground));
	}
</style>
