<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		checked?: boolean;
		label?: string;
		hint?: string;
		disabled?: boolean;
		required?: boolean;
		indeterminate?: boolean;
		id?: string;
		name?: string;
		ariaLabel?: string;
		onchange?: (e: Event) => void;
		children?: Snippet;
	}

	let {
		checked = $bindable(false),
		label,
		hint,
		disabled = false,
		required = false,
		indeterminate = false,
		id,
		name,
		ariaLabel,
		onchange,
		children,
	}: Props = $props();

	const inputId = $derived(id ?? `checkbox-${Math.random().toString(36).slice(2, 9)}`);
	const hintId = $derived(hint ? `${inputId}-hint` : undefined);

	function handleRef(node: HTMLInputElement) {
		node.indeterminate = indeterminate;
		$effect(() => {
			node.indeterminate = indeterminate;
		});
	}
</script>

<label class="checkbox" class:disabled for={inputId}>
	<input
		type="checkbox"
		id={inputId}
		{name}
		{disabled}
		{required}
		aria-label={ariaLabel}
		aria-describedby={hintId}
		bind:checked
		{onchange}
		use:handleRef
	/>
	<span class="indicator" aria-hidden="true">
		{#if indeterminate}
			<svg viewBox="0 0 16 16" width="12" height="12">
				<path d="M3 8h10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
			</svg>
		{:else if checked}
			<svg viewBox="0 0 16 16" width="12" height="12">
				<path
					d="M3 8l3.5 3.5L13 5"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{/if}
	</span>
	<span class="label-text">
		{#if children}
			{@render children()}
		{:else if label}
			{label}
		{/if}
		{#if required}<span class="required" aria-hidden="true">*</span>{/if}
		{#if hint}
			<span class="hint" id={hintId}>{hint}</span>
		{/if}
	</span>
</label>

<style>
	.checkbox {
		display: inline-flex;
		align-items: flex-start;
		gap: 0.5rem;
		cursor: pointer;
		font: inherit;
		color: hsl(var(--color-foreground));
	}

	.checkbox.disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 1rem;
		height: 1rem;
	}

	.indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		margin-top: 0.125rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.25rem;
		color: hsl(var(--color-primary-foreground));
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease;
	}

	input:checked + .indicator,
	input:indeterminate + .indicator {
		background: hsl(var(--color-primary));
		border-color: hsl(var(--color-primary));
	}

	input:focus-visible + .indicator {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.label-text {
		font-size: 0.9375rem;
		line-height: 1.35;
	}

	.required {
		color: hsl(var(--color-error));
		margin-left: 0.125rem;
	}

	.hint {
		display: block;
		margin-top: 0.125rem;
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
	}

	@media (prefers-reduced-motion: reduce) {
		.indicator {
			transition: none;
		}
	}
</style>
