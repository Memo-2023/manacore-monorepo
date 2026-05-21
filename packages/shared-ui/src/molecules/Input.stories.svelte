<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Input from './Input.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/Input',
		component: Input,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<div style="width: 320px;">
			<Input label="E-Mail" type="email" placeholder="dich@beispiel.de" />
		</div>
	{/snippet}
</Story>

<Story name="WithHint">
	{#snippet children()}
		<div style="width: 320px;">
			<Input
				label="Passwort"
				type="password"
				hint="Mindestens 12 Zeichen, sicher generiert."
				required
			/>
		</div>
	{/snippet}
</Story>

<Story name="WithError">
	{#snippet children()}
		<div style="width: 320px;">
			<Input label="Benutzername" value="🐭" error="Mindestens 3 Buchstaben oder Zahlen." />
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet children()}
		<div style="width: 320px;">
			<Input label="Versionsname" value="Phase 0" disabled hint="Wird aus dem Repo abgeleitet." />
		</div>
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.75rem; width: 320px;">
			<Input size="sm" label="sm" placeholder="kompakt" />
			<Input size="md" label="md" placeholder="standard" />
			<Input size="lg" label="lg" placeholder="komfortabel" />
		</div>
	{/snippet}
</Story>
