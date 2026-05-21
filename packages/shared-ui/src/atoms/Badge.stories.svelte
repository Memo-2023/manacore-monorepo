<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Badge from './Badge.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Badge',
		component: Badge,
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: { type: 'select' },
				options: ['neutral', 'primary', 'success', 'warning', 'error'],
			},
			size: {
				control: { type: 'select' },
				options: ['sm', 'md'],
			},
		},
	});
</script>

<Story name="Default" args={{ variant: 'neutral' }}>
	{#snippet children(args: any)}
		<Badge {...args}>Entwurf</Badge>
	{/snippet}
</Story>

<Story name="VariantSweep">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<Badge variant="neutral">Neutral</Badge>
			<Badge variant="primary">Primary</Badge>
			<Badge variant="success">Erfolg</Badge>
			<Badge variant="warning">Warnung</Badge>
			<Badge variant="error">Fehler</Badge>
		</div>
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; align-items:center;">
			<Badge variant="primary" size="sm">Klein</Badge>
			<Badge variant="primary" size="md">Mittel</Badge>
		</div>
	{/snippet}
</Story>
