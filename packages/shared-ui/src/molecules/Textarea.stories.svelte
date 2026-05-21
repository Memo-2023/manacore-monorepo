<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Textarea from './Textarea.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/Textarea',
		component: Textarea,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<div style="width: 360px;">
			<Textarea label="Notiz" placeholder="Ein paar Gedanken …" rows={4} />
		</div>
	{/snippet}
</Story>

<Story name="WithCharCount">
	{#snippet children()}
		<div style="width: 360px;">
			<Textarea
				label="Kurzbeschreibung"
				value="Vereins-Karten zur regelmäßigen Wiederholung."
				maxLength={200}
				hint="Wird auf der Sammlungs-Seite angezeigt."
			/>
		</div>
	{/snippet}
</Story>

<Story name="NearLimit">
	{#snippet children()}
		<div style="width: 360px;">
			<Textarea
				label="Knapp am Limit"
				value="Hier ist ein Text, der sich dem Maximum nähert. Noch wenige Zeichen frei."
				maxLength={120}
			/>
		</div>
	{/snippet}
</Story>

<Story name="WithError">
	{#snippet children()}
		<div style="width: 360px;">
			<Textarea
				label="Antwort"
				value=""
				error="Pflichtfeld — bitte mindestens einen Satz schreiben."
				required
			/>
		</div>
	{/snippet}
</Story>
