<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PillTabGroup from './PillTabGroup.svelte';

	const { Story } = defineMeta({
		title: 'Navigation/PillTabGroup',
		component: PillTabGroup,
		tags: ['autodocs'],
	});

	let langValue = $state('de');
	let navValue = $state('decks');
	let viewValue = $state('list');
</script>

<Story name="LanguageSwitcher">
	{#snippet children()}
		<PillTabGroup
			options={[
				{ id: 'de', label: 'DE', title: 'Deutsch' },
				{ id: 'en', label: 'EN', title: 'English' },
			]}
			value={langValue}
			onChange={(id) => (langValue = id)}
			ariaLabel="Sprache wechseln"
		/>
	{/snippet}
</Story>

<Story name="RouteNavigation">
	{#snippet children()}
		<PillTabGroup
			options={[
				{ id: 'decks', label: 'Stapel' },
				{ id: 'study', label: 'Lernen' },
				{ id: 'import', label: 'Import' },
				{ id: 'stats', label: 'Statistik' },
			]}
			value={navValue}
			onChange={(id) => (navValue = id)}
			ariaLabel="Hauptnavigation"
		/>
	{/snippet}
</Story>

<Story name="WithDisabled">
	{#snippet children()}
		<PillTabGroup
			options={[
				{ id: 'list', label: 'Liste' },
				{ id: 'grid', label: 'Raster' },
				{ id: 'graph', label: 'Graph', disabled: true },
			]}
			value={viewValue}
			onChange={(id) => (viewValue = id)}
		/>
	{/snippet}
</Story>
