<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import EmptyState from '../molecules/EmptyState.svelte';

	interface Props<TItem> {
		items: TItem[];
		getKey: (item: TItem) => string | number;
		item: Snippet<[TItem, number]>;
		header?: Snippet;
		listHeader?: Snippet;
		toolbar?: Snippet;
		emptyTitle?: string;
		emptyMessage?: string;
		emptyIcon?: Snippet;
		empty?: Snippet;
	}

	let {
		items,
		getKey,
		item,
		header,
		listHeader,
		toolbar,
		emptyTitle = 'Nichts hier',
		emptyMessage,
		emptyIcon,
		empty,
	}: Props<T> = $props();
</script>

<div class="base-list-view">
	{#if toolbar}
		{@render toolbar()}
	{/if}

	{#if header}
		<div class="header-row">
			{@render header()}
		</div>
	{/if}

	<div class="list-region">
		{#if listHeader}
			{@render listHeader()}
		{/if}

		{#each items as entry, i (getKey(entry))}
			{@render item(entry, i)}
		{/each}

		{#if items.length === 0}
			{#if empty}
				{@render empty()}
			{:else}
				<EmptyState variant="compact" title={emptyTitle} message={emptyMessage} icon={emptyIcon} />
			{/if}
		{/if}
	</div>
</div>

<style>
	.base-list-view {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		height: 100%;
		padding: 0.75rem;
		font-family: inherit;
	}

	@media (min-width: 640px) {
		.base-list-view {
			padding: 1rem;
		}
	}

	.header-row {
		display: flex;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground));
	}

	.list-region {
		flex: 1;
		overflow: auto;
	}
</style>
