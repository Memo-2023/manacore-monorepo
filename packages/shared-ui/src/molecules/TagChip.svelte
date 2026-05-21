<script lang="ts">
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	type Size = 'sm' | 'md';

	interface Props {
		label?: string;
		/** v0.1.x-Compat-Alias für `label`. */
		name?: string;
		color?: string | null;
		size?: Size;
		removable?: boolean;
		onRemove?: () => void;
		onclick?: (e: MouseEvent) => void;
		active?: boolean;
		removeLabel?: string;
	}

	let {
		label,
		name,
		color = null,
		size = 'sm',
		removable = false,
		onRemove,
		onclick,
		active = false,
		removeLabel = 'Entfernen',
	}: Props = $props();

	const effectiveLabel = $derived(label ?? name ?? '');

	function handleRemove(e: MouseEvent) {
		e.stopPropagation();
		onRemove?.();
	}
</script>

{#if onclick}
	<button
		type="button"
		class="chip size-{size}"
		class:active
		class:has-color={!!color}
		style:--tag-color={color || null}
		{onclick}
	>
		{#if color}
			<span class="dot" aria-hidden="true"></span>
		{/if}
		<span class="label">{effectiveLabel}</span>
		{#if removable && onRemove}
			<button type="button" class="remove" aria-label={removeLabel} onclick={handleRemove}>
				<DynamicIcon name="x" size="xs" />
			</button>
		{/if}
	</button>
{:else}
	<span
		class="chip size-{size}"
		class:active
		class:has-color={!!color}
		style:--tag-color={color || null}
	>
		{#if color}
			<span class="dot" aria-hidden="true"></span>
		{/if}
		<span class="label">{effectiveLabel}</span>
		{#if removable && onRemove}
			<button type="button" class="remove" aria-label={removeLabel} onclick={handleRemove}>
				<DynamicIcon name="x" size="xs" />
			</button>
		{/if}
	</span>
{/if}

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		background: hsl(var(--color-surface));
		color: hsl(var(--color-foreground));
		border: 1px solid hsl(var(--color-border));
		font-size: 0.8125rem;
		line-height: 1.4;
		font-family: inherit;
		white-space: nowrap;
		cursor: default;
	}

	button.chip {
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease;
	}

	button.chip:hover {
		background: hsl(var(--color-surface-hover));
		border-color: hsl(var(--color-primary) / 0.4);
	}

	button.chip:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.size-sm {
		padding: 0.125rem 0.5rem 0.125rem 0.5rem;
		font-size: 0.75rem;
	}
	.size-md {
		padding: 0.1875rem 0.625rem;
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
	}

	.chip.active {
		background: hsl(var(--color-primary) / 0.12);
		border-color: hsl(var(--color-primary) / 0.4);
		color: hsl(var(--color-primary));
	}

	.remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.0625rem;
		margin-left: 0.0625rem;
		margin-right: -0.1875rem;
		border: none;
		background: transparent;
		color: hsl(var(--color-muted-foreground));
		border-radius: 50%;
		cursor: pointer;
		font: inherit;
	}

	.remove:hover {
		color: hsl(var(--color-error));
		background: hsl(var(--color-error) / 0.1);
	}

	.remove:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 1px;
	}

	@media (prefers-reduced-motion: reduce) {
		button.chip {
			transition: none;
		}
	}
</style>
