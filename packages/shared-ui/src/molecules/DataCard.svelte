<script lang="ts">
	import type { Snippet } from 'svelte';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	type Trend = 'up' | 'down' | 'flat';

	interface Props {
		label: string;
		value: string | number;
		hint?: string;
		change?: string;
		trend?: Trend;
		icon?: Snippet;
	}

	let { label, value, hint, change, trend, icon }: Props = $props();
</script>

<article class="data-card">
	<header class="head">
		<span class="label">{label}</span>
		{#if icon}<span class="icon-slot">{@render icon()}</span>{/if}
	</header>
	<p class="value">{value}</p>
	{#if change || hint}
		<footer class="foot">
			{#if change}
				<span class="change trend-{trend ?? 'flat'}">
					{#if trend === 'up'}
						<DynamicIcon name="caret-up" size="xs" />
					{:else if trend === 'down'}
						<DynamicIcon name="caret-down" size="xs" />
					{/if}
					{change}
				</span>
			{/if}
			{#if hint}<span class="hint">{hint}</span>{/if}
		</footer>
	{/if}
</article>

<style>
	.data-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.125rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.625rem;
		font-family: inherit;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.label {
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
		font-weight: 500;
	}

	.icon-slot {
		color: hsl(var(--color-muted-foreground));
		display: inline-flex;
	}

	.value {
		margin: 0;
		font-size: 1.875rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: hsl(var(--color-foreground));
		line-height: 1.1;
	}

	.foot {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}

	.change {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		font-weight: 500;
	}

	.trend-up {
		color: hsl(var(--color-success));
	}
	.trend-down {
		color: hsl(var(--color-error));
	}
	.trend-flat {
		color: hsl(var(--color-muted-foreground));
	}

	.hint {
		color: hsl(var(--color-muted-foreground));
	}
</style>
