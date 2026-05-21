<script lang="ts" module>
	export interface PillDropdownItem {
		id: string;
		label: string;
		/** Inline SVG path string (16×16 viewBox). Optional. */
		iconSvg?: string;
		/** Optional image URL (used for app/avatar icons). */
		imageUrl?: string;
		onClick?: (event?: MouseEvent) => void;
		disabled?: boolean;
		danger?: boolean;
		primary?: boolean;
		active?: boolean;
		divider?: boolean;
		submenu?: PillDropdownItem[];
		showSplitButton?: boolean;
		onSplitClick?: () => void;
		/** Group ID — items sharing the same group render as a segmented toggle pill in PillDropdownBar. */
		group?: string;
		/** Progress value 0–1. When set, PillDropdownBar renders a progress ring instead of the icon. */
		progress?: number;
		/** v0.1.x-Compat: Phosphor-Icon-Name-String oder Component. Wird heute ignoriert; nutze iconSvg. */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	interface Props {
		items: PillDropdownItem[];
		label: string;
		/** Inline SVG path for the trigger icon. */
		iconSvg?: string;
		direction?: 'up' | 'down';
		isOpen?: boolean;
		onToggle?: (open: boolean) => void;
		header?: Snippet;
		footer?: Snippet;
		iconOnly?: boolean;
	}

	let {
		items,
		label,
		iconSvg,
		direction = 'down',
		isOpen = false,
		onToggle,
		header,
		footer,
		iconOnly = false,
	}: Props = $props();

	let internalOpen = $state(false);
	let triggerButton: HTMLButtonElement | undefined = $state();
	let dropdownPosition = $state({ top: 0, left: 0 });
	let openSubmenuId = $state<string | null>(null);

	const open = $derived(onToggle ? isOpen : internalOpen);

	function toggle() {
		if (triggerButton) {
			const rect = triggerButton.getBoundingClientRect();
			dropdownPosition =
				direction === 'down'
					? { top: rect.bottom + 8, left: rect.left }
					: { top: rect.top - 8, left: rect.left };
		}
		if (onToggle) onToggle(!isOpen);
		else internalOpen = !internalOpen;
	}

	function close() {
		openSubmenuId = null;
		if (onToggle) onToggle(false);
		else internalOpen = false;
	}

	function toggleSubmenu(itemId: string) {
		openSubmenuId = openSubmenuId === itemId ? null : itemId;
	}

	function handleItemClick(item: PillDropdownItem, event: MouseEvent) {
		if (item.submenu && item.submenu.length > 0) {
			toggleSubmenu(item.id);
			return;
		}
		if (item.onClick) item.onClick(event);
		close();
	}

	function handleSplitClick(item: PillDropdownItem, event: MouseEvent) {
		event.stopPropagation();
		if (item.onSplitClick) item.onSplitClick();
		close();
	}

	function handleSubmenuItemClick(item: PillDropdownItem) {
		if (item.onClick) item.onClick();
		close();
	}
</script>

<div class="pill-dropdown">
	<button
		bind:this={triggerButton}
		type="button"
		onclick={toggle}
		class="pill trigger"
		class:icon-only={iconOnly}
		aria-expanded={open}
		aria-haspopup="menu"
	>
		{#if iconSvg}
			<span class="pill-icon"><DynamicIcon {iconSvg} size="md" /></span>
		{/if}
		{#if !iconOnly}
			<span class="pill-label">{label}</span>
		{/if}
		<span class="chevron" class:rotated={open}>
			<DynamicIcon name="caret-down" size="xs" />
		</span>
	</button>

	{#if open}
		<button
			class="menu-backdrop"
			type="button"
			onclick={close}
			onkeydown={(e) => e.key === 'Escape' && close()}
			aria-label="Menü schließen"
		></button>

		<div
			class="fan-container"
			class:fan-up={direction === 'up'}
			class:fan-down={direction === 'down'}
			style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
			role="menu"
		>
			{#if header}
				<div class="dropdown-header">{@render header()}</div>
			{/if}

			{#each items.filter((i) => !i.disabled) as item, i (item.id)}
				{#if item.divider}
					<div
						class="dropdown-divider"
						style="animation-delay: {(header ? i + 1 : i) * 15}ms"
					></div>
				{:else}
					<div
						class="fan-pill-wrapper"
						class:has-split-button={item.showSplitButton}
						style="animation-delay: {(header ? i + 1 : i) * 15}ms"
					>
						<button
							type="button"
							onclick={(e) => handleItemClick(item, e)}
							class="pill fan-pill"
							class:danger-pill={item.danger}
							class:primary-pill={item.primary}
							class:active-pill={item.active}
							class:has-submenu={item.submenu && item.submenu.length > 0}
							class:submenu-open={openSubmenuId === item.id}
							role="menuitem"
						>
							{#if item.imageUrl}
								<img src={item.imageUrl} alt="" class="pill-image-icon" />
							{:else if item.iconSvg}
								<span class="pill-icon"><DynamicIcon iconSvg={item.iconSvg} size="md" /></span>
							{/if}
							<span class="pill-label">{item.label}</span>
							{#if item.active}
								<span class="check-icon">
									<DynamicIcon name="check" size="sm" />
								</span>
							{:else if item.submenu && item.submenu.length > 0}
								<span class="chevron-submenu" class:rotated={openSubmenuId === item.id}>
									<DynamicIcon name="caret-down" size="xs" />
								</span>
							{/if}
						</button>
						{#if item.showSplitButton && item.onSplitClick}
							<button
								type="button"
								onclick={(e) => handleSplitClick(item, e)}
								class="split-button"
								aria-label="In Split-Panel öffnen"
								title="Open in split panel (Ctrl/Cmd+Click)"
							>
								<DynamicIcon name="external" size="sm" />
							</button>
						{/if}
					</div>

					{#if item.submenu && item.submenu.length > 0 && openSubmenuId === item.id}
						<div class="submenu-container" role="menu">
							{#each item.submenu.filter((si) => !si.disabled) as subitem, si (subitem.id)}
								<button
									type="button"
									onclick={() => handleSubmenuItemClick(subitem)}
									class="pill fan-pill submenu-item"
									class:active-pill={subitem.active}
									style="animation-delay: {si * 15}ms"
									role="menuitem"
								>
									<span class="pill-label">{subitem.label}</span>
									{#if subitem.active}
										<span class="check-icon">
											<DynamicIcon name="check" size="sm" />
										</span>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				{/if}
			{/each}

			{#if footer}
				<div class="dropdown-footer">{@render footer()}</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.pill-dropdown {
		position: relative;
		z-index: 1;
	}

	.pill-dropdown:has(.fan-container) {
		z-index: 10000;
	}

	.trigger {
		position: relative;
		z-index: 10;
	}

	.trigger.icon-only {
		padding: 0.5rem 0.625rem;
	}

	.chevron {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 0.75rem;
		height: 0.75rem;
		margin-left: 0.25rem;
		transition: transform 200ms;
	}

	.chevron.rotated {
		transform: rotate(180deg);
	}

	.fan-container {
		position: fixed;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 9999;
	}

	.fan-up {
		flex-direction: column-reverse;
		transform: translateY(-100%);
	}

	.fan-down {
		flex-direction: column;
	}

	.fan-pill {
		animation: fanIn 150ms ease-out forwards;
		opacity: 0;
		transform: translateY(10px);
	}

	.fan-up .fan-pill {
		transform: translateY(-10px);
	}

	@keyframes fanIn {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.pill {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		text-decoration: none;
		transition:
			background-color 200ms,
			border-color 200ms,
			color 200ms,
			transform 200ms;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		color: hsl(var(--color-foreground));
		cursor: pointer;
		font-family: inherit;
	}

	.pill:hover {
		background: hsl(var(--color-surface-hover));
		transform: translateY(-2px);
	}

	.pill:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.active-pill {
		background: hsl(var(--color-primary) / 0.12);
		border-color: hsl(var(--color-primary) / 0.4);
		color: hsl(var(--color-primary));
	}

	.active-pill:hover {
		background: hsl(var(--color-primary) / 0.18);
	}

	.danger-pill {
		color: hsl(var(--color-error));
	}

	.danger-pill:hover {
		background: hsl(var(--color-error) / 0.12);
		border-color: hsl(var(--color-error) / 0.4);
	}

	.primary-pill {
		background: hsl(var(--color-primary));
		border-color: hsl(var(--color-primary));
		color: hsl(var(--color-primary-foreground));
		font-weight: 600;
	}

	.primary-pill:hover {
		background: hsl(var(--color-primary) / 0.92);
		border-color: hsl(var(--color-primary) / 0.92);
		color: hsl(var(--color-primary-foreground));
	}

	.pill-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.pill-image-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		border-radius: 0.25rem;
		object-fit: cover;
	}

	.check-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-left: 0.25rem;
		color: hsl(var(--color-primary));
	}

	.pill-label {
		display: inline;
	}

	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9998;
		background: transparent;
		border: none;
		cursor: default;
		padding: 0;
	}

	.dropdown-header {
		animation: fanIn 150ms ease-out forwards;
		opacity: 0;
		transform: translateY(10px);
		position: relative;
		z-index: 1;
	}

	.fan-up .dropdown-header {
		transform: translateY(-10px);
	}

	.dropdown-divider {
		height: 1px;
		background: hsl(var(--color-border));
		margin: 0.25rem 0.5rem;
		animation: fanIn 150ms ease-out forwards;
		opacity: 0;
	}

	.chevron-submenu {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 0.75rem;
		height: 0.75rem;
		margin-left: auto;
		transition: transform 200ms;
	}

	.chevron-submenu.rotated {
		transform: rotate(180deg);
	}

	.has-submenu {
		justify-content: flex-start;
	}

	.submenu-open {
		background: hsl(var(--color-surface-hover));
	}

	.submenu-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.submenu-item {
		padding: 0.5rem 0.875rem;
		font-size: 0.875rem;
		animation: fanIn 150ms ease-out forwards;
		opacity: 0;
		justify-content: flex-start;
	}

	.submenu-item .pill-label {
		flex: 1;
		text-align: left;
	}

	.fan-pill-wrapper {
		display: flex;
		align-items: stretch;
		gap: 2px;
		animation: fanIn 150ms ease-out forwards;
		opacity: 0;
		transform: translateY(10px);
	}

	.fan-up .fan-pill-wrapper {
		transform: translateY(-10px);
	}

	.fan-pill-wrapper .fan-pill {
		animation: none;
		opacity: 1;
		transform: none;
	}

	.fan-pill-wrapper.has-split-button .fan-pill {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		flex: 1;
	}

	.split-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-top-right-radius: 9999px;
		border-bottom-right-radius: 9999px;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		color: hsl(var(--color-foreground));
		cursor: pointer;
		transition:
			background-color 200ms,
			color 200ms;
	}

	.split-button:hover {
		background: hsl(var(--color-primary) / 0.12);
		color: hsl(var(--color-primary));
	}

	.split-button:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.dropdown-footer {
		animation: fanIn 150ms ease-out forwards;
		opacity: 0;
		transform: translateY(10px);
		position: relative;
		z-index: 1;
		margin-top: 0.25rem;
		padding-top: 0.5rem;
		border-top: 1px solid hsl(var(--color-border));
	}

	.fan-up .dropdown-footer {
		transform: translateY(-10px);
		margin-top: 0;
		margin-bottom: 0.25rem;
		padding-top: 0;
		padding-bottom: 0.5rem;
		border-top: none;
		border-bottom: 1px solid hsl(var(--color-border));
	}

	@media (max-width: 640px) {
		.fan-container {
			position: fixed;
			top: auto !important;
			left: 0 !important;
			right: 0;
			bottom: 0;
			width: 100%;
			max-height: 80vh;
			overflow-y: auto;
			padding: 1rem;
			padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
			background: hsl(var(--color-background));
			border-top: 1px solid hsl(var(--color-border));
			border-radius: 1rem 1rem 0 0;
			transform: none;
			animation: pillSheetUp 200ms ease-out;
		}

		.fan-up {
			transform: none;
			flex-direction: column;
		}

		.pill,
		.fan-pill,
		.submenu-item {
			min-height: 44px;
		}

		.menu-backdrop {
			background: hsl(var(--color-foreground) / 0.3);
		}
	}

	@keyframes pillSheetUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
