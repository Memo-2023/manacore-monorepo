<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Modal from './Modal.svelte';
	import Button from '../atoms/Button.svelte';
	import Text from '../atoms/Text.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/Modal',
		component: Modal,
		tags: ['autodocs'],
	});

	let basicOpen = $state(false);
	let withFooterOpen = $state(false);
	let largeOpen = $state(false);
</script>

<Story name="Basic">
	{#snippet children()}
		<div>
			<Button variant="primary" onclick={() => (basicOpen = true)}>Modal öffnen</Button>
			<Modal
				bind:open={basicOpen}
				title="Karten-Detail"
				description="Klick außerhalb oder Escape schließt."
			>
				{#snippet children()}
					<Text>
						Standard-Modal mit Titel + Beschreibung. Backdrop-Click und Escape schließen das Modal.
						Native dialog-Element, kein Focus-Trap-Polyfill nötig.
					</Text>
				{/snippet}
			</Modal>
		</div>
	{/snippet}
</Story>

<Story name="WithFooter">
	{#snippet children()}
		<div>
			<Button variant="primary" onclick={() => (withFooterOpen = true)}>Mit Footer</Button>
			<Modal
				bind:open={withFooterOpen}
				title="Karte verschieben"
				description="Wähle einen Zielstapel."
			>
				{#snippet children()}
					<Text tone="muted">
						In einer echten App stünden hier Auswahl-Optionen. Footer-Buttons nutzen die
						standard-Button-Variants.
					</Text>
				{/snippet}
				{#snippet footer()}
					<Button variant="ghost" size="sm" onclick={() => (withFooterOpen = false)}>
						Abbrechen
					</Button>
					<Button variant="primary" size="sm" onclick={() => (withFooterOpen = false)}>
						Verschieben
					</Button>
				{/snippet}
			</Modal>
		</div>
	{/snippet}
</Story>

<Story name="LargeContent">
	{#snippet children()}
		<div>
			<Button variant="primary" onclick={() => (largeOpen = true)}>Großes Modal</Button>
			<Modal bind:open={largeOpen} title="Lange Liste" size="lg">
				{#snippet children()}
					<div style="display:flex; flex-direction:column; gap:0.5rem;">
						{#each Array(20) as _, i (i)}
							<div
								style="padding:0.5rem 0.75rem; border:1px solid hsl(var(--color-border)); border-radius:0.5rem;"
							>
								Eintrag {i + 1}
							</div>
						{/each}
					</div>
				{/snippet}
			</Modal>
		</div>
	{/snippet}
</Story>
