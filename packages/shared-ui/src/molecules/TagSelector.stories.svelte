<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TagSelector, { type Tag } from './TagSelector.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/TagSelector',
		component: TagSelector,
		tags: ['autodocs'],
	});

	let tags = $state<Tag[]>([
		{ id: 'spanisch', label: 'Spanisch', color: '#FF6600' },
		{ id: 'vokabular', label: 'Vokabular', color: '#DC2626' },
		{ id: 'reise', label: 'Reise', color: '#16a34a' },
		{ id: 'a1', label: 'A1', color: '#07D6FF' },
		{ id: 'a2', label: 'A2', color: '#07D6FF' },
		{ id: 'b1', label: 'B1', color: '#6366F1' },
		{ id: 'kueche', label: 'Küche', color: '#F59E0B' },
		{ id: 'bahnhof', label: 'Bahnhof' },
	]);

	let selected = $state<string[]>(['spanisch', 'a1']);
	let nextId = 9;

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
	}

	function create(label: string) {
		const id = `new-${nextId++}`;
		tags = [...tags, { id, label }];
		selected = [...selected, id];
	}
</script>

<Story name="Default">
	{#snippet children()}
		<div style="width:18rem;">
			<TagSelector
				{tags}
				selectedIds={selected}
				onToggle={toggle}
				onCreate={create}
				onClear={() => (selected = [])}
				label="Tags"
			/>
		</div>
	{/snippet}
</Story>

<Story name="Empty">
	{#snippet children()}
		<div style="width:18rem;">
			<TagSelector
				tags={[]}
				selectedIds={[]}
				onToggle={() => {}}
				onCreate={() => {}}
				placeholder="Erste Tag erstellen …"
				createLabel="Anlegen:"
			/>
		</div>
	{/snippet}
</Story>

<Story name="ReadOnly">
	{#snippet children()}
		<div style="width:18rem;">
			<TagSelector {tags} selectedIds={['vokabular', 'a2']} onToggle={() => {}} label="Nur Lesen" />
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet children()}
		<div style="width:18rem;">
			<TagSelector
				{tags}
				selectedIds={['spanisch']}
				onToggle={() => {}}
				disabled
				label="Disabled"
			/>
		</div>
	{/snippet}
</Story>
