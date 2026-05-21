<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Checkbox from './Checkbox.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/Checkbox',
		component: Checkbox,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<Checkbox label="Newsletter abonnieren" />
	{/snippet}
</Story>

<Story name="Checked">
	{#snippet children()}
		<Checkbox label="Datenschutz akzeptiert" checked={true} />
	{/snippet}
</Story>

<Story name="WithHint">
	{#snippet children()}
		<Checkbox
			label="Verein-Mitgliedschaft anzeigen"
			hint="Auf deinem öffentlichen Profil sichtbar."
		/>
	{/snippet}
</Story>

<Story name="Indeterminate">
	{#snippet children()}
		<Checkbox label="Alle 12 Karten ausgewählt" indeterminate={true} />
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.5rem;">
			<Checkbox label="Disabled (unchecked)" disabled />
			<Checkbox label="Disabled (checked)" checked={true} disabled />
		</div>
	{/snippet}
</Story>

<Story name="Required">
	{#snippet children()}
		<Checkbox label="AGB akzeptieren" required hint="Pflicht für die Anmeldung." />
	{/snippet}
</Story>
