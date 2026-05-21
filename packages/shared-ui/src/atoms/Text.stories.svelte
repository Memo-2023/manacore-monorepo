<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Text',
		component: Text,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<Text>Standardtext im Body-Modus.</Text>
	{/snippet}
</Story>

<Story name="ToneSweep">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.5rem;">
			<Text tone="default">Default — Standard-Foreground</Text>
			<Text tone="muted">Muted — sekundärer Text, Caption, Meta</Text>
			<Text tone="primary">Primary — Akzent-Farbe</Text>
			<Text tone="error">Error — Fehler, kritisch</Text>
			<Text tone="success">Success — Erfolg</Text>
			<Text tone="warning">Warning — Warnung</Text>
		</div>
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.5rem;">
			<Text size="2xl" weight="bold" as="h1">2xl bold (h1)</Text>
			<Text size="xl" weight="semibold" as="h2">xl semibold (h2)</Text>
			<Text size="lg" weight="medium" as="h3">lg medium (h3)</Text>
			<Text size="base">base normal</Text>
			<Text size="sm" tone="muted">sm muted (caption)</Text>
			<Text size="xs" tone="muted">xs muted (meta)</Text>
		</div>
	{/snippet}
</Story>

<Story name="Truncate">
	{#snippet children()}
		<div style="width: 240px;">
			<Text truncate>
				Sehr langer Text, der über die verfügbare Breite hinausgeht und mit Ellipsis abgeschnitten
				werden soll.
			</Text>
		</div>
	{/snippet}
</Story>
