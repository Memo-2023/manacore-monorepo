<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Select from './Select.svelte';

	const variantOptions = [
		{ value: 'mana', label: 'Mana — Verein-Brand' },
		{ value: 'paper', label: 'Paper — Sepia, lese-fokussiert' },
		{ value: 'forest', label: 'Forest — Tiefgrün' },
		{ value: 'lume', label: 'Lume — Gold-Akzent' },
		{ value: 'twilight', label: 'Twilight — Indigo' },
		{ value: 'monochrome', label: 'Monochrom' },
	];

	const { Story } = defineMeta({
		title: 'Molecules/Select',
		component: Select,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<div style="width: 320px;">
			<Select label="Theme-Variant" placeholder="Wählen …" options={variantOptions} />
		</div>
	{/snippet}
</Story>

<Story name="WithValue">
	{#snippet children()}
		<div style="width: 320px;">
			<Select label="Aktives Theme" value="forest" options={variantOptions} />
		</div>
	{/snippet}
</Story>

<Story name="WithError">
	{#snippet children()}
		<div style="width: 320px;">
			<Select
				label="Pflichtfeld"
				placeholder="Wählen …"
				options={variantOptions}
				error="Bitte ein Theme auswählen."
				required
			/>
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet children()}
		<div style="width: 320px;">
			<Select label="Theme" value="mana" options={variantOptions} disabled />
		</div>
	{/snippet}
</Story>
