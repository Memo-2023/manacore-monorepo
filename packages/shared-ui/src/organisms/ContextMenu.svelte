<script lang="ts" module>
	export interface ContextMenuItem {
		id: string;
		label: string;
		/** Inline SVG path string (16×16 viewBox). Use `iconSvg` instead of a Component peer-dep. */
		iconSvg?: string;
		/** DynamicIcon name as an alternative to `iconSvg`. */
		iconName?: string;
		/** v0.1.x-Compat: Phosphor-Icon-Component. Wird heute ignoriert; nutze iconSvg/iconName. */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		shortcut?: string;
		disabled?: boolean;
		variant?: 'default' | 'danger';
		type?: 'item' | 'divider';
		action?: () => void;
		data?: unknown;
		toggle?: boolean;
		checked?: boolean;
	}

	export interface ContextMenuState<T = unknown> {
		visible: boolean;
		x: number;
		y: number;
		target: T | null;
	}

	export function createContextMenuState<T = unknown>(): ContextMenuState<T> {
		return { visible: false, x: 0, y: 0, target: null };
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	interface Props {
		visible: boolean;
		x: number;
		y: number;
		items: ContextMenuItem[];
		onClose: () => void;
		onSelect?: (item: ContextMenuItem) => void;
	}

	let { visible, x, y, items, onClose, onSelect }: Props = $props();

	let menuElement = $state<HTMLElement | null>(null);
	// svelte-ignore state_referenced_locally
	let adjustedX = $state(x);
	// svelte-ignore state_referenced_locally
	let adjustedY = $state(y);

	$effect(() => {
		if (visible && menuElement) {
			const rect = menuElement.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			adjustedX = x + rect.width > viewportWidth - 10 ? x - rect.width : x;
			adjustedY = y + rect.height > viewportHeight - 10 ? y - rect.height : y;
		}
	});

	function handleItemClick(item: ContextMenuItem) {
		if (item.disabled) return;
		if (item.action) item.action();
		if (onSelect) onSelect(item);
		onClose();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	onMount(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuElement && !menuElement.contains(e.target as Node)) onClose();
		};
		const handleScroll = () => onClose();

		window.addEventListener('click', handleClickOutside);
		window.addEventListener('scroll', handleScroll, true);
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('click', handleClickOutside);
			window.removeEventListener('scroll', handleScroll, true);
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

{#if visible}
	<div
		class="context-menu-backdrop"
		onpointerdown={(e) => {
			e.preventDefault();
			e.stopPropagation();
			onClose();
		}}
		onclick={(e) => {
			e.preventDefault();
			e.stopPropagation();
			onClose();
		}}
		oncontextmenu={(e) => {
			e.preventDefault();
			e.stopPropagation();
			onClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
		role="presentation"
		tabindex="-1"
	></div>

	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={menuElement}
		class="context-menu"
		style="left: {adjustedX}px; top: {adjustedY}px;"
		role="menu"
		tabindex="-1"
		transition:fly={{ duration: 150, y: -8 }}
		onclick={(e) => e.stopPropagation()}
		oncontextmenu={(e) => e.preventDefault()}
		onkeydown={handleKeyDown}
	>
		{#each items as item (item.id)}
			{#if item.type === 'divider'}
				<div class="divider"></div>
			{:else}
				<button
					type="button"
					class="menu-item"
					class:disabled={item.disabled}
					class:danger={item.variant === 'danger'}
					class:has-toggle={item.toggle}
					onclick={() => handleItemClick(item)}
					role="menuitem"
					disabled={item.disabled}
				>
					{#if item.toggle}
						<span class="item-toggle" class:checked={item.checked}>
							<span class="toggle-track">
								<span class="toggle-thumb"></span>
							</span>
						</span>
					{:else if item.iconSvg || item.iconName}
						<span class="item-icon">
							{#if item.iconSvg}
								<DynamicIcon iconSvg={item.iconSvg} size="md" />
							{:else if item.iconName}
								<DynamicIcon name={item.iconName as never} size="md" />
							{/if}
						</span>
					{/if}
					<span class="item-label">{item.label}</span>
					{#if item.shortcut}
						<span class="item-shortcut">{item.shortcut}</span>
					{/if}
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.context-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9998;
		background: transparent;
		pointer-events: auto;
	}

	.context-menu {
		position: fixed;
		z-index: 9999;
		min-width: 180px;
		max-width: 280px;
		padding: 0.375rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.625rem;
		pointer-events: auto;
		font-family: inherit;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		border: none;
		background: transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.8125rem;
		color: hsl(var(--color-foreground));
		text-align: left;
		transition: background-color 100ms ease;
		font-family: inherit;
	}

	.menu-item:hover:not(.disabled) {
		background: hsl(var(--color-muted));
	}

	.menu-item:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: -2px;
	}

	.menu-item.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.menu-item.danger {
		color: hsl(var(--color-error));
	}

	.menu-item.danger:hover:not(.disabled) {
		background: hsl(var(--color-error) / 0.1);
	}

	.item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: hsl(var(--color-muted-foreground));
	}

	.menu-item.danger .item-icon {
		color: hsl(var(--color-error));
	}

	.item-label {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-shortcut {
		font-size: 0.6875rem;
		color: hsl(var(--color-muted-foreground));
		margin-left: auto;
		padding-left: 1rem;
	}

	.divider {
		height: 1px;
		margin: 0.375rem 0.5rem;
		background: hsl(var(--color-border));
	}

	.menu-item.has-toggle {
		gap: 0.5rem;
	}

	.item-toggle {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.toggle-track {
		position: relative;
		width: 28px;
		height: 16px;
		background: hsl(var(--color-muted));
		border-radius: 8px;
		transition: background-color 150ms ease;
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		background: hsl(var(--color-background));
		border-radius: 50%;
		transition: transform 150ms ease;
	}

	.item-toggle.checked .toggle-track {
		background: hsl(var(--color-primary));
	}

	.item-toggle.checked .toggle-thumb {
		transform: translateX(12px);
	}
</style>
