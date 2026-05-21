<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Pill from './Pill.svelte';

	const { Story } = defineMeta({
		title: 'Navigation/Pill',
		component: Pill,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<Pill>Mein Tag</Pill>
	{/snippet}
</Story>

<Story name="Active">
	{#snippet children()}
		<Pill active>Aktiver Tab</Pill>
	{/snippet}
</Story>

<Story name="Primary">
	{#snippet children()}
		<Pill primary>Anmelden</Pill>
	{/snippet}
</Story>

<Story name="Danger">
	{#snippet children()}
		<Pill danger>Logout</Pill>
	{/snippet}
</Story>

<Story name="AsLink">
	{#snippet children()}
		<Pill href="#" title="Als Link">Profil</Pill>
	{/snippet}
</Story>

<Story name="VariantSweep">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<Pill>Default</Pill>
			<Pill active>Active</Pill>
			<Pill primary>Primary</Pill>
			<Pill danger>Danger</Pill>
			<Pill disabled>Disabled</Pill>
		</div>
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; align-items:center;">
			<Pill size="sm">Klein</Pill>
			<Pill size="md">Mittel</Pill>
		</div>
	{/snippet}
</Story>
