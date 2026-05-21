<script lang="ts">
	import type { Snippet } from 'svelte';

	type Type = 'text' | 'email' | 'url' | 'password' | 'number' | 'search' | 'tel' | 'date' | 'time';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		type?: Type;
		value?: string | number;
		placeholder?: string;
		label?: string;
		hint?: string;
		error?: string;
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		size?: Size;
		id?: string;
		name?: string;
		autocomplete?: string;
		ariaLabel?: string;
		leading?: Snippet;
		trailing?: Snippet;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
		onblur?: (e: FocusEvent) => void;
		onfocus?: (e: FocusEvent) => void;
		/** v0.1.x-Compat. */
		class?: string;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder,
		label,
		hint,
		error,
		disabled = false,
		readonly = false,
		required = false,
		size = 'md',
		id,
		name,
		autocomplete,
		ariaLabel,
		leading,
		trailing,
		oninput,
		onchange,
		onblur,
		onfocus,
		class: className = '',
	}: Props = $props();

	const inputId = $derived(id ?? `input-${Math.random().toString(36).slice(2, 9)}`);
	const hintId = $derived(hint || error ? `${inputId}-hint` : undefined);
</script>

<div class="field {className}">
	{#if label}
		<label for={inputId}>
			{label}
			{#if required}<span class="required" aria-hidden="true">*</span>{/if}
		</label>
	{/if}
	<div class="input-wrap size-{size}" class:disabled class:has-error={!!error}>
		{#if leading}<span class="affix leading">{@render leading()}</span>{/if}
		<input
			id={inputId}
			{type}
			{name}
			{placeholder}
			{disabled}
			{readonly}
			{required}
			autocomplete={autocomplete as never}
			aria-label={ariaLabel}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={hintId}
			bind:value
			{oninput}
			{onchange}
			{onblur}
			{onfocus}
		/>
		{#if trailing}<span class="affix trailing">{@render trailing()}</span>{/if}
	</div>
	{#if error}
		<p class="hint error" id={hintId} role="alert">{error}</p>
	{:else if hint}
		<p class="hint" id={hintId}>{hint}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	label {
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--color-foreground));
	}

	.required {
		color: hsl(var(--color-error));
		margin-left: 0.125rem;
	}

	.input-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.5rem;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.input-wrap:focus-within {
		border-color: hsl(var(--color-primary));
		box-shadow: 0 0 0 2px hsl(var(--color-primary) / 0.2);
	}

	.input-wrap.disabled {
		opacity: 0.6;
		background: hsl(var(--color-muted));
	}

	.input-wrap.has-error {
		border-color: hsl(var(--color-error));
	}

	.input-wrap.has-error:focus-within {
		box-shadow: 0 0 0 2px hsl(var(--color-error) / 0.2);
	}

	.size-sm {
		padding: 0.25rem 0.625rem;
	}
	.size-md {
		padding: 0.5rem 0.75rem;
	}
	.size-lg {
		padding: 0.625rem 0.875rem;
	}

	input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		color: hsl(var(--color-foreground));
		font: inherit;
		outline: none;
	}

	input::placeholder {
		color: hsl(var(--color-muted-foreground));
	}

	input:disabled {
		cursor: not-allowed;
	}

	.affix {
		display: inline-flex;
		align-items: center;
		color: hsl(var(--color-muted-foreground));
	}

	.hint {
		margin: 0;
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
	}

	.hint.error {
		color: hsl(var(--color-error));
	}

	@media (prefers-reduced-motion: reduce) {
		.input-wrap {
			transition: none;
		}
	}
</style>
