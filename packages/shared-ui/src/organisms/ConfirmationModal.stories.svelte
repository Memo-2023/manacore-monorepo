<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfirmationModal from './ConfirmationModal.svelte';
	import Button from '../atoms/Button.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/ConfirmationModal',
		component: ConfirmationModal,
		tags: ['autodocs'],
	});

	let confirmOpen = $state(false);
	let destroyOpen = $state(false);
	let lastAction = $state('—');
</script>

<Story name="Default">
	{#snippet children()}
		<div style="display:flex; gap:0.75rem; align-items:center;">
			<Button variant="primary" onclick={() => (confirmOpen = true)}>Aktion bestätigen</Button>
			<span>Letzte Aktion: <code>{lastAction}</code></span>
			<ConfirmationModal
				bind:open={confirmOpen}
				title="Karte zur Inbox verschieben?"
				description="Sie wird aus dem aktuellen Stapel entfernt und in die Inbox einsortiert."
				confirmLabel="Verschieben"
				cancelLabel="Abbrechen"
				onConfirm={() => (lastAction = 'confirmed')}
				onCancel={() => (lastAction = 'cancelled')}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Destructive">
	{#snippet children()}
		<div style="display:flex; gap:0.75rem; align-items:center;">
			<Button variant="danger" onclick={() => (destroyOpen = true)}>Stapel löschen</Button>
			<span>Letzte Aktion: <code>{lastAction}</code></span>
			<ConfirmationModal
				bind:open={destroyOpen}
				title="Stapel unwiderruflich löschen?"
				description="Alle Karten und Lern-Statistiken gehen verloren. Kein Rückgängig."
				confirmLabel="Löschen"
				cancelLabel="Abbrechen"
				destructive
				onConfirm={() => (lastAction = 'destroyed')}
				onCancel={() => (lastAction = 'kept')}
			/>
		</div>
	{/snippet}
</Story>
