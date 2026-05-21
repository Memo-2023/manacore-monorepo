<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PageHeader from './PageHeader.svelte';
	import Button from '../atoms/Button.svelte';
	import NavLink from '../navigation/NavLink.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/PageHeader',
		component: PageHeader,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<div style="width:42rem; max-width:100%;">
			<PageHeader title="Decks" />
		</div>
	{/snippet}
</Story>

<Story name="WithSubtitle">
	{#snippet children()}
		<div style="width:42rem; max-width:100%;">
			<PageHeader
				title="Spanisch — Alltagsvokabular"
				subtitle="24 Karten · 4 fällig · zuletzt gelernt vor 2 Tagen"
			/>
		</div>
	{/snippet}
</Story>

<Story name="WithEyebrow">
	{#snippet children()}
		<div style="width:42rem; max-width:100%;">
			<PageHeader
				eyebrow="Phase 12"
				title="Marketplace-Restore"
				subtitle="6 Phasen, schrittweise Wiederherstellung des Marketplace-Codes."
			/>
		</div>
	{/snippet}
</Story>

<Story name="WithActions">
	{#snippet children()}
		<div style="width:42rem; max-width:100%;">
			<PageHeader title="Stapel" subtitle="6 Stapel insgesamt">
				{#snippet actions()}
					<Button variant="ghost" size="sm">✨ KI-Deck</Button>
					<Button variant="primary" size="sm">Neues Deck</Button>
				{/snippet}
			</PageHeader>
		</div>
	{/snippet}
</Story>

<Story name="WithBreadcrumb">
	{#snippet children()}
		<div style="width:42rem; max-width:100%;">
			<PageHeader title="Karte bearbeiten" subtitle="basic-reverse · zuletzt 03.05.">
				{#snippet breadcrumb()}
					<NavLink href="/decks">Decks</NavLink>
					<span style="color:hsl(var(--color-muted-foreground));"> / </span>
					<NavLink href="/decks/spanisch">Spanisch</NavLink>
					<span style="color:hsl(var(--color-muted-foreground));"> / </span>
					<span>Karte 12</span>
				{/snippet}
			</PageHeader>
		</div>
	{/snippet}
</Story>
