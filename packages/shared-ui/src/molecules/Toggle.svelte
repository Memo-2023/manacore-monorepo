<script lang="ts">
	type Size = 'sm' | 'md';

	interface Props {
		checked?: boolean;
		/** v0.1.x-Compat-Alias für `checked`. */
		isOn?: boolean;
		label?: string;
		hint?: string;
		disabled?: boolean;
		size?: Size;
		id?: string;
		name?: string;
		ariaLabel?: string;
		onchange?: (e: Event) => void;
		/** v0.1.x-Compat: Toggle-Callback mit boolean-Wert. */
		onToggle?: (value: boolean) => void;
	}

	let {
		checked = $bindable(false),
		isOn,
		label,
		hint,
		disabled = false,
		size = 'md',
		id,
		name,
		ariaLabel,
		onchange,
		onToggle,
	}: Props = $props();

	// v0.1.x-Compat: wenn isOn gesetzt, schiebe es auf checked
	$effect(() => {
		if (isOn !== undefined && isOn !== checked) {
			checked = isOn;
		}
	});

	const inputId = $derived(id ?? `toggle-${Math.random().toString(36).slice(2, 9)}`);
	const hintId = $derived(hint ? `${inputId}-hint` : undefined);
</script>

<label class="toggle size-{size}" class:disabled for={inputId}>
	<input
		type="checkbox"
		role="switch"
		id={inputId}
		{name}
		{disabled}
		aria-label={ariaLabel}
		aria-describedby={hintId}
		aria-checked={checked}
		bind:checked
		onchange={(e) => {
			onchange?.(e);
			onToggle?.((e.currentTarget as HTMLInputElement).checked);
		}}
	/>
	<span class="track" aria-hidden="true">
		<span class="thumb"></span>
	</span>
	{#if label || hint}
		<span class="label-text">
			{#if label}{label}{/if}
			{#if hint}<span class="hint" id={hintId}>{hint}</span>{/if}
		</span>
	{/if}
</label>

<style>
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		cursor: pointer;
		font: inherit;
		color: hsl(var(--color-foreground));
	}

	.toggle.disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 1px;
		height: 1px;
	}

	.track {
		position: relative;
		display: inline-block;
		flex-shrink: 0;
		background: hsl(var(--color-muted));
		border-radius: 9999px;
		transition: background-color 0.2s ease;
	}

	.size-sm .track {
		width: 1.75rem;
		height: 1rem;
	}
	.size-md .track {
		width: 2.25rem;
		height: 1.25rem;
	}

	.thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		background: hsl(var(--color-surface));
		border-radius: 9999px;
		box-shadow: 0 1px 2px hsl(var(--color-foreground) / 0.15);
		transition: transform 0.2s ease;
	}

	.size-sm .thumb {
		width: 0.75rem;
		height: 0.75rem;
	}
	.size-md .thumb {
		width: 1rem;
		height: 1rem;
	}

	input:checked + .track {
		background: hsl(var(--color-primary));
	}

	.size-sm input:checked + .track .thumb {
		transform: translateX(0.75rem);
	}
	.size-md input:checked + .track .thumb {
		transform: translateX(1rem);
	}

	input:focus-visible + .track {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.label-text {
		font-size: 0.9375rem;
		line-height: 1.35;
	}

	.hint {
		display: block;
		margin-top: 0.125rem;
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
	}

	@media (prefers-reduced-motion: reduce) {
		.track,
		.thumb {
			transition: none;
		}
	}
</style>
