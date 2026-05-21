<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from './Button.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Button',
		component: Button,
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: { type: 'select' },
				options: ['primary', 'secondary', 'ghost', 'danger'],
			},
			size: {
				control: { type: 'select' },
				options: ['sm', 'md', 'lg'],
			},
		},
	});
</script>

<Story name="Default" args={{ variant: 'secondary' }}>
	{#snippet children(args: any)}
		<Button {...args}>Speichern</Button>
	{/snippet}
</Story>

<Story name="Primary" args={{ variant: 'primary' }}>
	{#snippet children(args: any)}
		<Button {...args}>Aktion ausführen</Button>
	{/snippet}
</Story>

<Story name="Ghost" args={{ variant: 'ghost' }}>
	{#snippet children(args: any)}
		<Button {...args}>Abbrechen</Button>
	{/snippet}
</Story>

<Story name="Danger" args={{ variant: 'danger' }}>
	{#snippet children(args: any)}
		<Button {...args}>Löschen</Button>
	{/snippet}
</Story>

<Story name="Loading" args={{ variant: 'primary', loading: true }}>
	{#snippet children(args: any)}
		<Button {...args}>Speichern</Button>
	{/snippet}
</Story>

<Story name="Disabled" args={{ variant: 'primary', disabled: true }}>
	{#snippet children(args: any)}
		<Button {...args}>Speichern</Button>
	{/snippet}
</Story>

<Story name="VariantSweep">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<Button variant="primary">Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="danger">Danger</Button>
		</div>
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; gap:0.5rem; align-items:center;">
			<Button variant="primary" size="sm">Klein</Button>
			<Button variant="primary" size="md">Mittel</Button>
			<Button variant="primary" size="lg">Groß</Button>
		</div>
	{/snippet}
</Story>
