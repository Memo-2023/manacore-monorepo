<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		label?: string;
		hint?: string;
		error?: string;
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		rows?: number;
		maxLength?: number;
		id?: string;
		name?: string;
		ariaLabel?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
		onblur?: (e: FocusEvent) => void;
	}

	let {
		value = $bindable(''),
		placeholder,
		label,
		hint,
		error,
		disabled = false,
		readonly = false,
		required = false,
		rows = 4,
		maxLength,
		id,
		name,
		ariaLabel,
		oninput,
		onchange,
		onblur,
	}: Props = $props();

	const inputId = $derived(id ?? `textarea-${Math.random().toString(36).slice(2, 9)}`);
	const hintId = $derived(hint || error ? `${inputId}-hint` : undefined);
	const remainingChars = $derived(maxLength ? maxLength - (value?.length ?? 0) : null);
</script>

<div class="field">
	{#if label}
		<label for={inputId}>
			{label}
			{#if required}<span class="required" aria-hidden="true">*</span>{/if}
		</label>
	{/if}
	<div class="wrap" class:disabled class:has-error={!!error}>
		<textarea
			id={inputId}
			{name}
			{placeholder}
			{disabled}
			{readonly}
			{required}
			{rows}
			maxlength={maxLength}
			aria-label={ariaLabel}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={hintId}
			bind:value
			{oninput}
			{onchange}
			{onblur}
		></textarea>
	</div>
	<div class="meta">
		{#if error}
			<p class="hint error" id={hintId} role="alert">{error}</p>
		{:else if hint}
			<p class="hint" id={hintId}>{hint}</p>
		{:else}
			<span></span>
		{/if}
		{#if remainingChars !== null}
			<span class="char-count" class:near-limit={remainingChars <= 20}>
				{remainingChars}
			</span>
		{/if}
	</div>
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

	.wrap.has-error:focus-within {
		box-shadow: 0 0 0 2px hsl(var(--color-error) / 0.2);
	}

	textarea {
		display: block;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: transparent;
		color: hsl(var(--color-foreground));
		font: inherit;
		font-family: inherit;
		outline: none;
		resize: vertical;
		min-height: 4rem;
	}

	textarea::placeholder {
		color: hsl(var(--color-muted-foreground));
	}

	textarea:disabled {
		cursor: not-allowed;
	}

	.meta {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.hint {
		margin: 0;
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
	}

	.hint.error {
		color: hsl(var(--color-error));
	}

	.char-count {
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground));
		font-variant-numeric: tabular-nums;
	}

	.char-count.near-limit {
		color: hsl(var(--color-warning));
	}

	@media (prefers-reduced-motion: reduce) {
		.wrap {
			transition: none;
		}
	}
</style>
