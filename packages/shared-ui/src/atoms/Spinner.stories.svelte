<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Spinner from './Spinner.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Spinner',
		component: Spinner,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<Spinner />
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; gap:1rem; align-items:center;">
			<Spinner size="xs" />
			<Spinner size="sm" />
			<Spinner size="md" />
			<Spinner size="lg" />
		</div>
	{/snippet}
</Story>

<Story name="ToneSweep">
	{#snippet children()}
		<div style="display:flex; gap:1rem; align-items:center;">
			<Spinner tone="default" />
			<Spinner tone="muted" />
			<Spinner tone="primary" />
			<span style="color: hsl(var(--color-error));">
				<Spinner tone="inherit" />
			</span>
		</div>
	{/snippet}
</Story>

<Story name="InText">
	{#snippet children()}
		<p style="display:inline-flex; gap:0.5rem; align-items:center;">
			<Spinner size="sm" tone="primary" />
			<span>Lade Karten …</span>
		</p>
	{/snippet}
</Story>
