<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NavLink from './NavLink.svelte';

	const { Story } = defineMeta({
		title: 'Navigation/NavLink',
		component: NavLink,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<NavLink href="#">Stapel</NavLink>
	{/snippet}
</Story>

<Story name="Active">
	{#snippet children()}
		<NavLink href="#" active>Stapel (aktive Route)</NavLink>
	{/snippet}
</Story>

<Story name="LinkRow">
	{#snippet children()}
		<div style="display:flex; gap:1.5rem;">
			<NavLink href="/decks" active>Stapel</NavLink>
			<NavLink href="/study">Lernen</NavLink>
			<NavLink href="/import">Import</NavLink>
			<NavLink href="/stats">Statistik</NavLink>
		</div>
	{/snippet}
</Story>
