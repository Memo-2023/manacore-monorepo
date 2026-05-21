<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ManaLogoIcon from './ManaLogoIcon.svelte';

	const { Story } = defineMeta({
		title: 'Navigation/ManaLogoIcon',
		component: ManaLogoIcon,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<ManaLogoIcon />
	{/snippet}
</Story>

<Story name="SizeSweep">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:1rem; align-items:flex-start;">
			<ManaLogoIcon size="sm" />
			<ManaLogoIcon size="md" />
			<ManaLogoIcon size="lg" />
			<ManaLogoIcon size="xl" />
		</div>
	{/snippet}
</Story>

<Story name="Animated">
	{#snippet children()}
		<div>
			<ManaLogoIcon size="xl" animated ariaLabel="mana — Welleneintro" />
			<p style="margin-top:1rem; color: hsl(var(--color-muted-foreground)); font-size: 0.875rem;">
				M-A-N-A-Sequenz, ~1.1s. Bei `prefers-reduced-motion: reduce` statisch.
			</p>
		</div>
	{/snippet}
</Story>

<Story name="WithTitle">
	{#snippet children()}
		<ManaLogoIcon size="lg" title="mana e.V." />
	{/snippet}
</Story>
