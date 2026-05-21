<script lang="ts">
	import TagSelector, { type Tag as SelectorTag } from './TagSelector.svelte';

	interface TagShape {
		id: string;
		name: string;
		color?: string | null;
	}

	interface Props {
		tags: TagShape[];
		selectedIds: string[];
		onChange: (ids: string[]) => void;
		onCreate?: (name: string) => void;
		maxTags?: number;
		label?: string;
		placeholder?: string;
	}

	let {
		tags,
		selectedIds,
		onChange,
		onCreate,
		maxTags,
		label,
		placeholder = 'Tag suchen oder anlegen …',
	}: Props = $props();

	const selectorTags = $derived<SelectorTag[]>(
		tags.map((t) => ({ id: t.id, label: t.name, color: t.color ?? null }))
	);

	function handleToggle(id: string) {
		if (selectedIds.includes(id)) {
			onChange(selectedIds.filter((sid) => sid !== id));
			return;
		}
		if (maxTags && selectedIds.length >= maxTags) return;
		onChange([...selectedIds, id]);
	}

	function handleClear() {
		onChange([]);
	}
</script>

<TagSelector
	tags={selectorTags}
	{selectedIds}
	onToggle={handleToggle}
	onCreate={onCreate ? (name) => onCreate(name) : undefined}
	onClear={selectedIds.length > 0 ? handleClear : undefined}
	{label}
	{placeholder}
/>
