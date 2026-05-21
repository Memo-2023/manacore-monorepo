<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TagChip from './TagChip.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/TagChip',
		component: TagChip,
		tags: ['autodocs'],
	});

	let removed = $state(false);
</script>

<Story name="Default">
	{#snippet children()}
		<TagChip label="Spanisch" color="#FF6600" />
	{/snippet}
</Story>

<Story name="Active">
	{#snippet children()}
		<TagChip label="aktiv" active />
	{/snippet}
</Story>

<Story name="Removable">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; align-items:center;">
			{#if !removed}
				<TagChip label="entfernbar" color="#16a34a" removable onRemove={() => (removed = true)} />
			{:else}
				<span style="color:hsl(var(--color-muted-foreground)); font-size:0.875rem;">
					Tag entfernt — Story neu laden zum Reset
				</span>
			{/if}
		</div>
	{/snippet}
</Story>

<Story name="Clickable">
	{#snippet children()}
		<TagChip label="klickbar" color="#6366F1" onclick={() => alert('clicked')} />
	{/snippet}
</Story>

<Story name="ChipRow">
	{#snippet children()}
		<div style="display:flex; flex-wrap:wrap; gap:0.375rem; max-width:24rem;">
			<TagChip label="Spanisch" color="#FF6600" />
			<TagChip label="Vokabular" color="#DC2626" />
			<TagChip label="A1" color="#07D6FF" />
			<TagChip label="Reise" color="#16a34a" />
			<TagChip label="2026" />
		</div>
	{/snippet}
</Story>
