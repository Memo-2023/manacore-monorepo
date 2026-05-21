<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Skeleton from './Skeleton.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Skeleton',
		component: Skeleton,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<Skeleton width="240px" height="0.875rem" />
	{/snippet}
</Story>

<Story name="ShapeSweep">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:1rem; width: 280px;">
			<Skeleton shape="rect" width="100%" height="2.5rem" />
			<Skeleton shape="line" width="80%" />
			<Skeleton shape="circle" height="3rem" />
		</div>
	{/snippet}
</Story>

<Story name="ListLoading">
	{#snippet children()}
		<div style="width: 280px;">
			<Skeleton shape="line" count={5} />
		</div>
	{/snippet}
</Story>

<Story name="CardSkeleton">
	{#snippet children()}
		<div style="width: 320px;">
			<Skeleton shape="card" />
		</div>
	{/snippet}
</Story>

<Story name="ListWithAvatar">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.75rem; width: 320px;">
			{#each Array(3) as _, i (i)}
				<div style="display:flex; gap:0.75rem; align-items:center;">
					<Skeleton shape="circle" height="2.5rem" />
					<div style="flex:1; display:flex; flex-direction:column; gap:0.375rem;">
						<Skeleton shape="line" width="60%" />
						<Skeleton shape="line" width="100%" />
					</div>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
