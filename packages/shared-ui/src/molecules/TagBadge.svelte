<script lang="ts">
	type Size = 'sm' | 'md';

	interface Props {
		label: string;
		color?: string | null;
		size?: Size;
		title?: string;
	}

	let { label, color = null, size = 'sm', title }: Props = $props();
</script>

<span
	class="tag-badge size-{size}"
	style:--tag-color={color || null}
	class:has-color={!!color}
	{title}
>
	{#if color}
		<span class="dot" aria-hidden="true"></span>
	{/if}
	<span class="label">{label}</span>
</span>

<style>
	.tag-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.0625rem 0.5rem;
		border-radius: 9999px;
		background: hsl(var(--color-muted));
		color: hsl(var(--color-muted-foreground));
		font-size: 0.75rem;
		line-height: 1.5;
		font-family: inherit;
		white-space: nowrap;
	}

	.size-md {
		padding: 0.125rem 0.625rem;
		font-size: 0.8125rem;
	}

	.dot {
		display: inline-block;
		width: 0.4375rem;
		height: 0.4375rem;
		border-radius: 50%;
		background: var(--tag-color, hsl(var(--color-primary)));
		flex-shrink: 0;
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.has-color {
		color: hsl(var(--color-foreground));
	}
</style>
