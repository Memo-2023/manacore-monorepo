<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TagBadge from './TagBadge.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/TagBadge',
		component: TagBadge,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<TagBadge label="Sprache" />
	{/snippet}
</Story>

<Story name="WithColor">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<TagBadge label="Spanisch" color="#FF6600" />
			<TagBadge label="Geschichte" color="#DC2626" />
			<TagBadge label="Botanik" color="#16a34a" />
			<TagBadge label="Akkord" color="#07D6FF" />
		</div>
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; align-items:center;">
			<TagBadge label="sm" color="#16a34a" size="sm" />
			<TagBadge label="md" color="#16a34a" size="md" />
		</div>
	{/snippet}
</Story>
