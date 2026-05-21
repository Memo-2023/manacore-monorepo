<script lang="ts">
	import { dragSource } from '../dnd/drag-source';
	import { passiveDropZone } from '../dnd/passive-drop';
	import type { DragPayload, DragType } from '../dnd/types';
	import Pill from './Pill.svelte';

	interface TagItem {
		id: string;
		name: string;
		color: string;
	}

	interface Props {
		tags: TagItem[];
		selectedIds: string[];
		onToggle: (tagId: string) => void;
		onClear: () => void;
		/** Called to navigate (e.g. SvelteKit's `goto`). Required if managementHref/createHref are clicked. */
		onNavigate?: (href: string) => void;
		/** Called when an item (task, card, etc.) is dropped on a tag pill */
		onTagDrop?: (tagId: string, payload: DragPayload) => void;
		dropAccepts?: DragType[];
		managementHref?: string;
		loading?: boolean;
		showCreateButton?: boolean;
		createHref?: string;
		aboveFilterStrip?: boolean;
		/** Use 'static' when inside a flex container (bottom-stack pattern). Default: 'fixed'. */
		positioning?: 'fixed' | 'static';
		manageLabel?: string;
		filterLabel?: string;
		createLabel?: string;
		emptyLabel?: string;
		loadingLabel?: string;
	}

	let {
		tags,
		selectedIds,
		onToggle,
		onClear,
		onNavigate,
		onTagDrop,
		dropAccepts = ['task'],
		managementHref = '/tags',
		loading = false,
		showCreateButton = true,
		createHref,
		aboveFilterStrip = false,
		positioning = 'fixed',
		manageLabel = 'Tags verwalten',
		filterLabel = 'Filter',
		createLabel = 'Neuer Tag',
		emptyLabel = 'Keine Tags vorhanden — + Erstellen',
		loadingLabel = 'Lädt …',
	}: Props = $props();

	const resolvedCreateHref = $derived(createHref ?? managementHref + '?new=true');
	const hasSelectedTags = $derived(selectedIds.length > 0);
	const hasTags = $derived(tags.length > 0);

	const sortedTags = $derived.by(() =>
		[...tags].sort((a, b) => a.name.localeCompare(b.name, 'de'))
	);

	function isTagSelected(tagId: string): boolean {
		return selectedIds.includes(tagId);
	}

	function navigate(href: string) {
		if (onNavigate) onNavigate(href);
		else window.location.assign(href);
	}
</script>

<div
	class="tag-strip-wrapper"
	class:above-filter-strip={aboveFilterStrip}
	class:tag-strip-static={positioning === 'static'}
>
	<div class="tag-strip-container">
		<div class:hidden={!hasSelectedTags} class="filter-slot">
			<Pill danger onclick={() => onClear()} title="Filter löschen" disabled={!hasSelectedTags}>
				{filterLabel}
			</Pill>
		</div>

		<Pill onclick={() => navigate(managementHref)} title={manageLabel}>
			{manageLabel}
		</Pill>

		{#if loading}
			<div class="loading-state">{loadingLabel}</div>
		{:else if !hasTags}
			<Pill onclick={() => navigate(managementHref)}>{emptyLabel}</Pill>
		{:else}
			{#each sortedTags as tag (tag.id)}
				<button
					type="button"
					class="tag-pill"
					class:selected={isTagSelected(tag.id)}
					onclick={() => onToggle(tag.id)}
					title={tag.name}
					style="--tag-color: {tag.color || '#8b5cf6'}"
					use:dragSource={{
						type: 'tag',
						data: () => ({ id: tag.id, name: tag.name, color: tag.color || '#8b5cf6' }),
					}}
					use:passiveDropZone={{
						accepts: dropAccepts,
						onDrop: (payload) => onTagDrop?.(tag.id, payload),
						highlightClass: 'tag-drop-highlight',
						disabled: !onTagDrop,
					}}
				>
					<span class="tag-dot"></span>
					<span class="tag-name">{tag.name}</span>
				</button>
			{/each}

			{#if showCreateButton}
				<Pill primary onclick={() => navigate(resolvedCreateHref)} title={createLabel}>
					{createLabel}
				</Pill>
			{/if}
		{/if}
	</div>
</div>

<style>
	.tag-strip-wrapper {
		position: fixed;
		bottom: calc(70px + env(safe-area-inset-bottom, 0px));
		left: 0;
		right: 0;
		z-index: 49;
	}

	.tag-strip-static {
		position: relative;
		bottom: auto;
		z-index: auto;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: center;
		pointer-events: none;
		transition: bottom 200ms ease;
		height: 64px;
	}

	.tag-strip-wrapper.above-filter-strip {
		bottom: calc(110px + env(safe-area-inset-bottom, 0px));
	}

	.tag-strip-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: transparent;
		pointer-events: auto;
		width: fit-content;
		max-width: 100%;
		margin-left: auto;
		margin-right: auto;
		padding: 0;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.tag-strip-container::-webkit-scrollbar {
		display: none;
	}

	.tag-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0 0.875rem;
		height: 44px;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		border: 1px solid hsl(var(--color-border));
		background: hsl(var(--color-surface));
		color: hsl(var(--color-foreground));
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background-color 150ms ease,
			border-color 150ms ease,
			transform 150ms ease;
		font-family: inherit;
	}

	.tag-pill:hover {
		background: hsl(var(--color-surface-hover));
	}

	.tag-pill:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.tag-pill.selected {
		background: var(--tag-color) !important;
		border-color: var(--tag-color) !important;
		color: hsl(var(--color-primary-foreground));
	}

	.tag-pill.selected .tag-dot {
		background-color: currentColor;
	}

	.tag-pill.selected .tag-name {
		color: inherit;
	}

	.filter-slot.hidden {
		visibility: hidden;
		pointer-events: none;
	}

	.tag-pill:active {
		transform: scale(0.98);
	}

	.tag-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background-color: var(--tag-color);
		flex-shrink: 0;
	}

	.tag-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--color-foreground));
		white-space: nowrap;
	}

	.loading-state {
		font-size: 0.875rem;
		color: hsl(var(--color-muted-foreground));
		padding: 0.5rem;
	}

	:global(.tag-pill.mana-drag-source-active) {
		opacity: 0.5;
		transform: scale(0.95) !important;
	}

	:global(.tag-pill.mana-passive-zone-success) {
		animation: tag-drop-success 400ms ease-out;
	}

	@keyframes tag-drop-success {
		0% {
			transform: scale(1.2);
		}
		50% {
			transform: scale(0.95);
		}
		100% {
			transform: scale(1);
		}
	}

	@media (max-width: 640px) {
		.tag-strip-wrapper {
			left: 0;
			right: 0;
		}

		.tag-strip-container {
			padding: 0;
		}
	}
</style>
