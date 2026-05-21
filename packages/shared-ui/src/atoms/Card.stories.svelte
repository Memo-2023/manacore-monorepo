<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Card from './Card.svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Card',
		component: Card,
		tags: ['autodocs'],
		argTypes: {
			padding: {
				control: { type: 'select' },
				options: ['none', 'sm', 'md', 'lg'],
			},
			interactive: { control: 'boolean' },
		},
	});
</script>

<Story name="Default" args={{ padding: 'md' }}>
	{#snippet children(args: any)}
		<div style="width: 320px;">
			<Card {...args}>
				<h3 style="margin:0 0 0.5rem;">Karten-Titel</h3>
				<p style="margin:0; color: hsl(var(--color-muted-foreground));">
					Beschreibender Sekundärtext, ungefähr eine Zeile lang.
				</p>
			</Card>
		</div>
	{/snippet}
</Story>

<Story name="WithBadge" args={{ padding: 'md' }}>
	{#snippet children(args: any)}
		<div style="width: 320px;">
			<Card {...args}>
				<div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
					<Badge variant="primary">Neu</Badge>
					<Badge variant="warning">3 ausstehend</Badge>
				</div>
				<h3 style="margin:0 0 0.5rem;">Mit Badges</h3>
				<p style="margin:0; color: hsl(var(--color-muted-foreground));">
					Badges sitzen oben links.
				</p>
			</Card>
		</div>
	{/snippet}
</Story>

<Story name="Interactive" args={{ padding: 'md', interactive: true }}>
	{#snippet children(args: any)}
		<div style="width: 320px;">
			<Card {...args} ariaLabel="Klick mich">
				<h3 style="margin:0 0 0.5rem;">Klickbare Karte</h3>
				<p style="margin:0; color: hsl(var(--color-muted-foreground));">
					Hover/Focus zeigt Primary-Border.
				</p>
			</Card>
		</div>
	{/snippet}
</Story>

<Story name="WithActions" args={{ padding: 'md' }}>
	{#snippet children(args: any)}
		<div style="width: 320px;">
			<Card {...args}>
				<h3 style="margin:0 0 0.5rem;">Karte mit Aktionen</h3>
				<p style="margin:0 0 1rem; color: hsl(var(--color-muted-foreground));">
					Action-Row am Ende.
				</p>
				<div style="display:flex; gap:0.5rem; justify-content:flex-end;">
					<Button variant="ghost" size="sm">Abbrechen</Button>
					<Button variant="primary" size="sm">Speichern</Button>
				</div>
			</Card>
		</div>
	{/snippet}
</Story>

<Story name="PaddingSweep">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:1rem; width: 280px;">
			<Card padding="none">
				<div style="padding:0.25rem; background: hsl(var(--color-muted));">
					padding=none (kein inneres Spacing)
				</div>
			</Card>
			<Card padding="sm">padding=sm</Card>
			<Card padding="md">padding=md</Card>
			<Card padding="lg">padding=lg</Card>
		</div>
	{/snippet}
</Story>
