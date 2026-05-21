<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ContactAvatar from './ContactAvatar.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ContactAvatar',
		component: ContactAvatar,
		tags: ['autodocs'],
	});
</script>

<Story name="Initials">
	{#snippet children()}
		<ContactAvatar name="Till Zimmer" />
	{/snippet}
</Story>

<Story name="Email">
	{#snippet children()}
		<ContactAvatar email="anna.maier@beispiel.de" />
	{/snippet}
</Story>

<Story name="Placeholder">
	{#snippet children()}
		<ContactAvatar />
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; gap:0.75rem; align-items:center;">
			<ContactAvatar name="Till Zimmer" size="xs" />
			<ContactAvatar name="Till Zimmer" size="sm" />
			<ContactAvatar name="Till Zimmer" size="md" />
			<ContactAvatar name="Till Zimmer" size="lg" />
			<ContactAvatar name="Till Zimmer" size="xl" />
		</div>
	{/snippet}
</Story>

<Story name="WithStatus">
	{#snippet children()}
		<div style="display:flex; gap:1rem; align-items:center;">
			<ContactAvatar name="Till Zimmer" status="online" size="lg" />
			<ContactAvatar name="Anna Maier" status="busy" size="lg" />
			<ContactAvatar name="Lukas Berg" status="offline" size="lg" />
		</div>
	{/snippet}
</Story>
