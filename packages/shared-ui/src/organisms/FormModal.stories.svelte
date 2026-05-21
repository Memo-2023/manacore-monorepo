<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import FormModal from './FormModal.svelte';
	import Input from '../molecules/Input.svelte';
	import Textarea from '../molecules/Textarea.svelte';
	import Select from '../molecules/Select.svelte';
	import Button from '../atoms/Button.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/FormModal',
		component: FormModal,
		tags: ['autodocs'],
	});

	let createOpen = $state(false);
	let submitting = $state(false);
	let lastSubmit = $state<{ title?: string; deck?: string; note?: string } | null>(null);

	let titleVal = $state('');
	let deckVal = $state('default');
	let noteVal = $state('');

	function submit() {
		submitting = true;
		setTimeout(() => {
			submitting = false;
			createOpen = false;
			lastSubmit = { title: titleVal, deck: deckVal, note: noteVal };
		}, 600);
	}
</script>

<Story name="CreateCard">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.75rem;">
			<Button variant="primary" onclick={() => (createOpen = true)}>Karte hinzufügen</Button>
			{#if lastSubmit}
				<pre style="margin:0; font-size:0.8125rem; color: hsl(var(--color-muted-foreground));">
{JSON.stringify(lastSubmit, null, 2)}
				</pre>
			{/if}
			<FormModal
				bind:open={createOpen}
				title="Neue Karte"
				description="Wird sofort dem Stapel hinzugefügt."
				submitLabel="Erstellen"
				{submitting}
				canSubmit={titleVal.trim().length > 0}
				onSubmit={submit}
			>
				{#snippet children()}
					<Input label="Titel" bind:value={titleVal} placeholder="Vorderseite der Karte" required />
					<Select
						label="Stapel"
						bind:value={deckVal}
						options={[
							{ value: 'default', label: 'Inbox (Default)' },
							{ value: 'deutsch-niederlandisch', label: 'Deutsch ↔ Niederländisch' },
							{ value: 'spanisch-vokabular', label: 'Spanisch-Vokabular' },
						]}
					/>
					<Textarea
						label="Anmerkung"
						bind:value={noteVal}
						hint="Optional. Markdown ist erlaubt."
						rows={3}
					/>
				{/snippet}
			</FormModal>
		</div>
	{/snippet}
</Story>
