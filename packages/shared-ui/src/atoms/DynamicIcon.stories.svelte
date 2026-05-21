<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DynamicIcon from './DynamicIcon.svelte';

	const ALL_ICONS = [
		'check',
		'x',
		'plus',
		'minus',
		'search',
		'user',
		'users',
		'gear',
		'home',
		'tag',
		'heart',
		'star',
		'caret-down',
		'caret-up',
		'caret-left',
		'caret-right',
		'arrow-left',
		'arrow-right',
		'info',
		'warning',
		'error',
		'success',
		'trash',
		'edit',
		'eye',
		'eye-off',
		'calendar',
		'clock',
		'mail',
		'link',
		'external',
	];

	const { Story } = defineMeta({
		title: 'Atoms/DynamicIcon',
		component: DynamicIcon,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<DynamicIcon name="check" />
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; gap:1rem; align-items:center;">
			<DynamicIcon name="star" size="xs" />
			<DynamicIcon name="star" size="sm" />
			<DynamicIcon name="star" size="md" />
			<DynamicIcon name="star" size="lg" />
		</div>
	{/snippet}
</Story>

<Story name="AllIcons">
	{#snippet children()}
		<div
			style="display:grid; grid-template-columns:repeat(8, minmax(4rem, 1fr)); gap:0.75rem; max-width:48rem;"
		>
			{#each ALL_ICONS as iconName (iconName)}
				<div
					style="display:flex; flex-direction:column; align-items:center; gap:0.25rem; padding:0.5rem; border:1px solid hsl(var(--color-border)); border-radius:0.375rem;"
				>
					<DynamicIcon name={iconName as any} size="md" />
					<span style="font-size:0.625rem; color:hsl(var(--color-muted-foreground));"
						>{iconName}</span
					>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="ColoredContext">
	{#snippet children()}
		<div style="display:flex; gap:1rem; align-items:center; font-size:0.875rem;">
			<span
				style="color:hsl(var(--color-success)); display:inline-flex; gap:0.375rem; align-items:center;"
			>
				<DynamicIcon name="success" /> erledigt
			</span>
			<span
				style="color:hsl(var(--color-warning)); display:inline-flex; gap:0.375rem; align-items:center;"
			>
				<DynamicIcon name="warning" /> warnung
			</span>
			<span
				style="color:hsl(var(--color-error)); display:inline-flex; gap:0.375rem; align-items:center;"
			>
				<DynamicIcon name="error" /> fehler
			</span>
		</div>
	{/snippet}
</Story>

<Story name="CustomSvg">
	{#snippet children()}
		<DynamicIcon
			ariaLabel="Custom Icon"
			iconSvg="<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/>"
			size="lg"
		/>
	{/snippet}
</Story>
