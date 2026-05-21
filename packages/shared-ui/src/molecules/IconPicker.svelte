<script lang="ts">
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	export interface IconSlot {
		name: string;
		svg: string;
	}

	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		selectedIcon?: string;
		onIconChange: (icon: string) => void;
		/** Wenn nicht gesetzt, rendert IconPicker eine leere Liste (v0.1.x-Compat: Konsument lieferte phosphor-Inventar implizit). */
		categories?: Record<string, IconSlot[]>;
		size?: Size;
		label?: string;
		showSearch?: boolean;
		showCategories?: boolean;
		searchPlaceholder?: string;
		emptyLabel?: string;
	}

	let {
		selectedIcon,
		onIconChange,
		categories = {},
		size = 'md',
		label = 'Icon wählen',
		showSearch = true,
		showCategories = true,
		searchPlaceholder = 'Icon suchen …',
		emptyLabel = 'Kein Icon gefunden',
	}: Props = $props();

	let searchQuery = $state('');

	const filteredCategories = $derived.by(() => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return categories;

		const result: Record<string, IconSlot[]> = {};
		for (const [category, icons] of Object.entries(categories)) {
			const matched = icons.filter((icon) => icon.name.toLowerCase().includes(query));
			if (matched.length > 0) result[category] = matched;
		}
		return result;
	});

	function handleKeyDown(e: KeyboardEvent, iconName: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onIconChange(iconName);
		}
	}

	const iconSize = $derived(
		size === 'sm' ? ('sm' as const) : size === 'lg' ? ('md' as const) : ('md' as const)
	);
</script>

<div class="icon-picker" role="group" aria-label={label}>
	{#if showSearch}
		<input type="text" class="search" placeholder={searchPlaceholder} bind:value={searchQuery} />
	{/if}

	{#each Object.entries(filteredCategories) as [category, icons] (category)}
		<div class="category">
			{#if showCategories}
				<div class="category-label">{category}</div>
			{/if}
			<div class="grid size-{size}" role="radiogroup" aria-label={category}>
				{#each icons as icon (icon.name)}
					{@const isSelected = selectedIcon === icon.name}
					<button
						type="button"
						class="slot size-{size}"
						class:selected={isSelected}
						onclick={() => onIconChange(icon.name)}
						onkeydown={(e) => handleKeyDown(e, icon.name)}
						role="radio"
						aria-checked={isSelected}
						aria-label={icon.name}
						title={icon.name}
					>
						<DynamicIcon iconSvg={icon.svg} size={iconSize} />
						{#if isSelected}
							<span class="check" aria-hidden="true">
								<DynamicIcon name="check" size="xs" />
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/each}

	{#if Object.keys(filteredCategories).length === 0}
		<p class="empty">{emptyLabel}</p>
	{/if}
</div>

<style>
	.icon-picker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-family: inherit;
	}

	.search {
		width: 100%;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		color: hsl(var(--color-foreground));
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.375rem;
		outline: none;
		font: inherit;
		font-size: 0.875rem;
	}

	.search::placeholder {
		color: hsl(var(--color-muted-foreground));
	}

	.search:focus-visible {
		border-color: hsl(var(--color-primary));
		outline: 2px solid hsl(var(--color-primary) / 0.3);
		outline-offset: 0;
	}

	.category-label {
		margin-bottom: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: hsl(var(--color-muted-foreground));
	}

	.grid {
		display: flex;
		flex-wrap: wrap;
	}

	.grid.size-sm {
		gap: 0.25rem;
	}

	.grid.size-md {
		gap: 0.375rem;
	}

	.grid.size-lg {
		gap: 0.5rem;
	}

	.slot {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		color: hsl(var(--color-foreground));
		background: hsl(var(--color-surface));
		border: 1px solid transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		transition:
			background-color 120ms,
			transform 120ms,
			border-color 120ms;
		font-family: inherit;
	}

	.slot.size-sm {
		width: 2rem;
		height: 2rem;
	}

	.slot.size-md {
		width: 2.5rem;
		height: 2.5rem;
	}

	.slot.size-lg {
		width: 3rem;
		height: 3rem;
	}

	.slot:hover {
		background: hsl(var(--color-surface-hover));
		transform: scale(1.08);
	}

	.slot:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.slot.selected {
		background: hsl(var(--color-primary) / 0.12);
		border-color: hsl(var(--color-primary));
		color: hsl(var(--color-primary));
		transform: scale(1.08);
	}

	.check {
		position: absolute;
		top: -0.25rem;
		right: -0.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 0.875rem;
		height: 0.875rem;
		color: hsl(var(--color-primary-foreground));
		background: hsl(var(--color-primary));
		border-radius: 50%;
	}

	.empty {
		margin: 0.5rem 0;
		padding: 0.5rem 0;
		text-align: center;
		font-size: 0.875rem;
		color: hsl(var(--color-muted-foreground));
	}
</style>
