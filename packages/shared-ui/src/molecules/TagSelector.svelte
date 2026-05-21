<script lang="ts">
	import TagChip from './TagChip.svelte';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	export interface Tag {
		id: string;
		/** Anzeige-Name. v0.1.x-Konsumenten haben `name`, v1.0.0 nimmt `label` — beide funktionieren. */
		label?: string;
		/** v0.1.x-Alias für `label`. */
		name?: string;
		color?: string | null;
	}

	interface Props {
		tags: Tag[];
		selectedIds?: string[];
		/** v0.1.x-Compat: Tag-Objekte statt Tag-IDs. Bei gesetztem `selectedTags` wird `selectedIds` daraus abgeleitet. */
		selectedTags?: Tag[];
		onToggle?: (id: string) => void;
		/** v0.1.x-Compat: liefert die aktualisierte Tag-Liste. */
		onTagsChange?: (tags: Tag[]) => void;
		onCreate?: (label: string) => void;
		onClear?: () => void;
		label?: string;
		placeholder?: string;
		/** v0.1.x-Compat-Alias für placeholder. */
		searchPlaceholder?: string;
		/** v0.1.x-Compat: heute ignoriert. */
		addTagLabel?: string;
		clearLabel?: string;
		createLabel?: string;
		emptyLabel?: string;
		disabled?: boolean;
		/** v0.1.x-Compat: heute ignoriert. */
		maxTags?: number;
	}

	let {
		tags,
		selectedIds,
		selectedTags,
		onToggle,
		onTagsChange,
		onCreate,
		onClear,
		label,
		placeholder = 'Suchen oder neu …',
		searchPlaceholder,
		clearLabel = 'Auswahl leeren',
		createLabel = 'Anlegen:',
		emptyLabel = 'Keine Tags',
		disabled = false,
	}: Props = $props();

	// v0.1.x-Compat: selectedTags → selectedIds
	const effectiveSelectedIds = $derived<string[]>(
		selectedIds ?? selectedTags?.map((t) => t.id) ?? []
	);

	const effectivePlaceholder = $derived(searchPlaceholder ?? placeholder);

	function handleToggle(id: string) {
		if (onToggle) {
			onToggle(id);
			return;
		}
		if (onTagsChange) {
			const current = effectiveSelectedIds;
			if (current.includes(id)) {
				const next = tags.filter((t) => current.includes(t.id) && t.id !== id);
				onTagsChange(next);
			} else {
				const tag = tags.find((t) => t.id === id);
				if (tag) {
					const next = [...tags.filter((t) => current.includes(t.id)), tag];
					onTagsChange(next);
				}
			}
		}
	}

	let query = $state('');

	function tagLabel(t: Tag): string {
		return t.label ?? t.name ?? '';
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return tags;
		return tags.filter((t) => tagLabel(t).toLowerCase().includes(q));
	});

	const exactMatch = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return tags.some((t) => tagLabel(t).toLowerCase() === q);
	});

	const canCreate = $derived(!!onCreate && query.trim().length > 0 && !exactMatch);

	function isSelected(id: string): boolean {
		return effectiveSelectedIds.includes(id);
	}

	function handleCreate() {
		if (!canCreate || !onCreate) return;
		onCreate(query.trim());
		query = '';
	}

	function handleSearchKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (canCreate) handleCreate();
		}
	}
</script>

<div class="tag-selector" class:disabled>
	{#if label}<span class="header-label">{label}</span>{/if}

	{#if effectiveSelectedIds.length > 0}
		<div class="selected" aria-label="Ausgewählte Tags">
			{#each tags.filter((t) => isSelected(t.id)) as tag (tag.id)}
				<TagChip
					label={tagLabel(tag)}
					color={tag.color}
					removable
					onRemove={() => handleToggle(tag.id)}
				/>
			{/each}
			{#if onClear}
				<button type="button" class="clear" onclick={() => onClear?.()}>{clearLabel}</button>
			{/if}
		</div>
	{/if}

	<div class="search">
		<DynamicIcon name="search" size="sm" />
		<input type="text" {placeholder} bind:value={query} {disabled} onkeydown={handleSearchKey} />
	</div>

	<div class="options" role="listbox" aria-multiselectable="true">
		{#if filtered.length === 0 && !canCreate}
			<p class="empty">{emptyLabel}</p>
		{:else}
			{#each filtered as tag (tag.id)}
				<button
					type="button"
					class="option"
					class:selected={isSelected(tag.id)}
					role="option"
					aria-selected={isSelected(tag.id)}
					onclick={() => handleToggle(tag.id)}
				>
					{#if tag.color}
						<span class="dot" style:background={tag.color} aria-hidden="true"></span>
					{/if}
					<span class="opt-label">{tagLabel(tag)}</span>
					{#if isSelected(tag.id)}
						<DynamicIcon name="check" size="sm" />
					{/if}
				</button>
			{/each}
			{#if canCreate}
				<button type="button" class="option create" onclick={handleCreate}>
					<DynamicIcon name="plus" size="sm" />
					<span class="opt-label">{createLabel} <strong>{query.trim()}</strong></span>
				</button>
			{/if}
		{/if}
	</div>
</div>

<style>
	.tag-selector {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.625rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.625rem;
		font-family: inherit;
	}

	.tag-selector.disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	.header-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: hsl(var(--color-foreground));
	}

	.selected {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		align-items: center;
	}

	.clear {
		margin-left: 0.25rem;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: inherit;
	}
	.clear:hover {
		color: hsl(var(--color-foreground));
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		background: hsl(var(--color-muted));
		border-radius: 0.375rem;
		color: hsl(var(--color-muted-foreground));
	}
	.search:focus-within {
		background: hsl(var(--color-surface-hover));
		color: hsl(var(--color-foreground));
	}

	.search input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		color: hsl(var(--color-foreground));
		font: inherit;
		font-size: 0.8125rem;
		outline: none;
	}
	.search input::placeholder {
		color: hsl(var(--color-muted-foreground));
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		max-height: 14rem;
		overflow-y: auto;
	}

	.empty {
		margin: 0.5rem 0;
		text-align: center;
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
	}

	.option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		color: hsl(var(--color-foreground));
		cursor: pointer;
		font: inherit;
		font-size: 0.8125rem;
		text-align: left;
	}

	.option:hover {
		background: hsl(var(--color-surface-hover));
	}

	.option:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: -2px;
	}

	.option.selected {
		color: hsl(var(--color-primary));
		background: hsl(var(--color-primary) / 0.08);
	}

	.option.create {
		color: hsl(var(--color-muted-foreground));
		font-style: italic;
	}
	.option.create strong {
		color: hsl(var(--color-foreground));
		font-style: normal;
		font-weight: 500;
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.opt-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
