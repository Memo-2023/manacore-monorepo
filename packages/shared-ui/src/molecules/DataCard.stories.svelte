<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DataCard from './DataCard.svelte';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/DataCard',
		component: DataCard,
		tags: ['autodocs'],
	});
</script>

<Story name="Default">
	{#snippet children()}
		<div style="width:14rem;">
			<DataCard label="Reviews heute" value={42} />
		</div>
	{/snippet}
</Story>

<Story name="WithChange">
	{#snippet children()}
		<div style="display:grid; grid-template-columns:repeat(3, 14rem); gap:1rem;">
			<DataCard label="Reviews heute" value={42} change="+12" trend="up" hint="vs gestern" />
			<DataCard label="Streak" value="7 Tage" change="−1" trend="down" hint="vs Ziel" />
			<DataCard label="Karten gelernt" value={234} change="±0" trend="flat" hint="diese Woche" />
		</div>
	{/snippet}
</Story>

<Story name="WithIcon">
	{#snippet children()}
		<div style="width:14rem;">
			<DataCard label="Stapel" value={12} hint="3 mit fälligen Karten">
				{#snippet icon()}<DynamicIcon name="tag" size="sm" />{/snippet}
			</DataCard>
		</div>
	{/snippet}
</Story>

<Story name="LongLabel">
	{#snippet children()}
		<div style="width:14rem;">
			<DataCard
				label="Durchschnittliche Antwortzeit"
				value="2.4s"
				change="−0.3s"
				trend="up"
				hint="schneller als Vorwoche"
			/>
		</div>
	{/snippet}
</Story>
