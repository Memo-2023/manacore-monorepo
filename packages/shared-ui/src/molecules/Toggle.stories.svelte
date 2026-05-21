<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Toggle from './Toggle.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/Toggle',
		component: Toggle,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<Toggle label="Dark-Mode" />
	{/snippet}
</Story>

<Story name="On">
	{#snippet children()}
		<Toggle label="Cross-Device-Sync aktiv" checked={true} />
	{/snippet}
</Story>

<Story name="WithHint">
	{#snippet children()}
		<Toggle
			label="Reduzierte Bewegung"
			hint="Animationen werden auf 0.01ms gekürzt."
			checked={true}
		/>
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.625rem;">
			<Toggle size="sm" label="Klein" />
			<Toggle size="md" label="Mittel" />
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.5rem;">
			<Toggle label="Disabled (off)" disabled />
			<Toggle label="Disabled (on)" checked={true} disabled />
		</div>
	{/snippet}
</Story>
