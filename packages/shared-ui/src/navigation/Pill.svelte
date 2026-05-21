<script lang="ts">
	import type { Snippet } from 'svelte';

	type Size = 'sm' | 'md';

	interface Props {
		size?: Size;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		oncontextmenu?: (e: MouseEvent) => void;
		/** v0.1.x-Compat PascalCase-Alias für oncontextmenu. */
		onContextMenu?: (e: MouseEvent) => void;
		active?: boolean;
		disabled?: boolean;
		danger?: boolean;
		primary?: boolean;
		iconOnly?: boolean;
		ariaLabel?: string;
		title?: string;
		children?: Snippet;
		leading?: Snippet;
		trailing?: Snippet;
		/** v0.1.x-Compat: Label-String als Alternative zum children-Snippet. */
		label?: string;
		/** v0.1.x-Compat: Icon-Name oder Component (heute ignoriert; nutze leading-Snippet). */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		/** v0.1.x-Compat: Custom-Class auf Wrapper. */
		class?: string;
		/** v0.1.x-Compat: Bindbares Element-Ref. */
		element?: HTMLElement | null;
		/** v0.1.x-Compat: Data-Attribute. */
		data?: Record<string, string>;
	}

	let {
		size = 'md',
		href,
		onclick,
		oncontextmenu,
		onContextMenu,
		active = false,
		disabled = false,
		danger = false,
		primary = false,
		iconOnly = false,
		ariaLabel,
		title,
		children,
		leading,
		trailing,
		label,
		class: className = '',
		element = $bindable(null),
	}: Props = $props();

	const tag = $derived(href ? 'a' : 'button');
</script>

<svelte:element
	this={tag}
	bind:this={element}
	class="pill size-{size} {className}"
	class:active
	class:disabled
	class:danger
	class:primary
	class:icon-only={iconOnly}
	{href}
	type={tag === 'button' ? 'button' : undefined}
	disabled={tag === 'button' ? disabled : undefined}
	aria-disabled={tag === 'a' && disabled ? 'true' : undefined}
	aria-pressed={onclick && active ? 'true' : undefined}
	aria-label={ariaLabel}
	{title}
	{onclick}
	oncontextmenu={oncontextmenu ?? onContextMenu}
>
	{#if leading}<span class="affix">{@render leading()}</span>{/if}
	{#if !iconOnly}
		{#if children}<span class="label">{@render children()}</span>
		{:else if label}<span class="label">{label}</span>{/if}
	{/if}
	{#if trailing}<span class="affix">{@render trailing()}</span>{/if}
</svelte:element>

<style>
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		border-radius: 9999px;
		border: 1px solid hsl(var(--color-border));
		background: hsl(var(--color-surface));
		color: hsl(var(--color-foreground));
		font-family: inherit;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.pill:disabled,
	.pill.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pill:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.pill:not(:disabled):not(.disabled):hover {
		background: hsl(var(--color-surface-hover));
	}

	/* sizes */
	.size-sm {
		padding: 0.25rem 0.625rem;
		font-size: 0.8125rem;
	}
	.size-md {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
	}

	.size-sm.icon-only {
		padding: 0.25rem;
	}
	.size-md.icon-only {
		padding: 0.375rem;
	}

	/* active */
	.pill.active {
		background: hsl(var(--color-primary) / 0.15);
		border-color: hsl(var(--color-primary) / 0.4);
		color: hsl(var(--color-primary));
	}
	.pill.active:not(:disabled):hover {
		background: hsl(var(--color-primary) / 0.2);
	}

	/* primary — vibrant CTA pill */
	.pill.primary {
		background: hsl(var(--color-primary));
		border-color: hsl(var(--color-primary));
		color: hsl(var(--color-primary-foreground));
	}
	.pill.primary:not(:disabled):hover {
		background: hsl(var(--color-primary) / 0.9);
	}

	/* danger */
	.pill.danger {
		color: hsl(var(--color-error));
		border-color: hsl(var(--color-error) / 0.3);
	}
	.pill.danger:not(:disabled):hover {
		background: hsl(var(--color-error) / 0.1);
		border-color: hsl(var(--color-error) / 0.5);
	}

	.affix {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
	}

	.label {
		display: inline-flex;
		align-items: center;
	}

	@media (prefers-reduced-motion: reduce) {
		.pill {
			transition: none;
		}
	}
</style>
