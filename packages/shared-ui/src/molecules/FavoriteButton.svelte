<script lang="ts">
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	type Variant = 'heart' | 'star' | 'pin';

	interface Props {
		active: boolean;
		onclick: () => void;
		variant?: Variant;
		size?: 'sm' | 'md' | number;
		label?: string;
		/** v0.1.x-Compat: aktive Farbe (heute ignoriert — Token primary). */
		activeColor?: string;
		/** v0.1.x-Compat. */
		class?: string;
	}

	let { active, onclick, variant = 'heart', size = 'md', label }: Props = $props();
	const normalizedSize = $derived<'sm' | 'md'>(
		typeof size === 'number' ? (size < 16 ? 'sm' : 'md') : size
	);

	const defaultLabel = $derived(
		variant === 'pin'
			? active
				? 'Loslösen'
				: 'Anpinnen'
			: active
				? 'Favorit entfernen'
				: 'Favorit'
	);

	const iconName = $derived.by(() => {
		if (active) return `${variant}-fill` as const;
		return variant;
	});

	const iconSize = $derived(size === 'sm' ? ('sm' as const) : ('md' as const));
</script>

<button
	type="button"
	{onclick}
	class="favorite-btn size-{normalizedSize}"
	class:active
	aria-label={label ?? defaultLabel}
	aria-pressed={active}
	title={label ?? defaultLabel}
>
	<DynamicIcon name={iconName} size={iconSize} />
</button>

<style>
	.favorite-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		color: hsl(var(--color-muted-foreground));
		cursor: pointer;
		transition:
			background-color 120ms,
			color 120ms;
		font-family: inherit;
	}

	.favorite-btn.size-sm {
		padding: 0.125rem;
	}

	.favorite-btn:hover {
		background: hsl(var(--color-surface-hover));
		color: hsl(var(--color-foreground));
	}

	.favorite-btn:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.favorite-btn.active {
		color: hsl(var(--color-primary));
	}

	.favorite-btn.active:hover {
		color: hsl(var(--color-primary));
		background: hsl(var(--color-primary) / 0.08);
	}
</style>
