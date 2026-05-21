<script lang="ts">
	type Size = 'sm' | 'md' | 'lg';

	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		value?: string;
		options: Option[];
		label?: string;
		placeholder?: string;
		hint?: string;
		error?: string;
		disabled?: boolean;
		required?: boolean;
		size?: Size;
		id?: string;
		name?: string;
		ariaLabel?: string;
		onchange?: (e: Event) => void;
	}

	let {
		value = $bindable(''),
		options,
		label,
		placeholder,
		hint,
		error,
		disabled = false,
		required = false,
		size = 'md',
		id,
		name,
		ariaLabel,
		onchange,
	}: Props = $props();

	const inputId = $derived(id ?? `select-${Math.random().toString(36).slice(2, 9)}`);
	const hintId = $derived(hint || error ? `${inputId}-hint` : undefined);
</script>

<div class="field">
	{#if label}
		<label for={inputId}>
			{label}
			{#if required}<span class="required" aria-hidden="true">*</span>{/if}
		</label>
	{/if}
	<div class="wrap size-{size}" class:disabled class:has-error={!!error}>
		<select
			id={inputId}
			{name}
			{disabled}
			{required}
			aria-label={ariaLabel}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={hintId}
			bind:value
			{onchange}
		>
			{#if placeholder}
				<option value="" disabled selected hidden>{placeholder}</option>
			{/if}
			{#each options as opt}
				<option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
			{/each}
		</select>
		<span class="caret" aria-hidden="true">▾</span>
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

	.wrap {
		position: relative;
		display: flex;
		align-items: center;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.5rem;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.wrap:focus-within {
		border-color: hsl(var(--color-primary));
		box-shadow: 0 0 0 2px hsl(var(--color-primary) / 0.2);
	}

	.wrap.disabled {
		opacity: 0.6;
		background: hsl(var(--color-muted));
	}

	.wrap.has-error {
		border-color: hsl(var(--color-error));
	}

	.size-sm select {
		padding: 0.25rem 2rem 0.25rem 0.625rem;
	}
	.size-md select {
		padding: 0.5rem 2rem 0.5rem 0.75rem;
	}
	.size-lg select {
		padding: 0.625rem 2rem 0.625rem 0.875rem;
	}

	select {
		appearance: none;
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		color: hsl(var(--color-foreground));
		font: inherit;
		outline: none;
		cursor: pointer;
	}

	select:disabled {
		cursor: not-allowed;
	}

	.caret {
		position: absolute;
		right: 0.625rem;
		pointer-events: none;
		color: hsl(var(--color-muted-foreground));
		font-size: 0.875rem;
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
		.wrap {
			transition: none;
		}
	}
</style>
