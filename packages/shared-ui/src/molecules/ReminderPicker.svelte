<script lang="ts">
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	export interface ReminderOption {
		value: number | null;
		label: string;
	}

	interface Props {
		value: number | null;
		onChange: (minutes: number | null) => void;
		options?: ReminderOption[];
		disabled?: boolean;
	}

	const DEFAULT_OPTIONS: ReminderOption[] = [
		{ value: null, label: 'Keine Erinnerung' },
		{ value: 5, label: '5 Minuten vorher' },
		{ value: 15, label: '15 Minuten vorher' },
		{ value: 30, label: '30 Minuten vorher' },
		{ value: 60, label: '1 Stunde vorher' },
		{ value: 1440, label: '1 Tag vorher' },
	];

	let { value, onChange, options = DEFAULT_OPTIONS, disabled = false }: Props = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const raw = target.value;
		onChange(raw === '' ? null : parseInt(raw, 10));
	}

	const hasReminder = $derived(value !== null);
</script>

<label class="reminder-picker" class:active={hasReminder}>
	<DynamicIcon name={hasReminder ? 'bell-fill' : 'bell-slash'} size="sm" ariaLabel="Erinnerung" />
	<select {disabled} onchange={handleChange} value={value ?? ''}>
		{#each options as option (option.value ?? 'none')}
			<option value={option.value ?? ''}>{option.label}</option>
		{/each}
	</select>
</label>

<style>
	.reminder-picker {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.125rem 0.25rem;
		color: hsl(var(--color-muted-foreground));
		font-family: inherit;
	}

	.reminder-picker.active {
		color: hsl(var(--color-primary));
	}

	.reminder-picker select {
		appearance: none;
		-webkit-appearance: none;
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0;
	}

	.reminder-picker.active select {
		font-weight: 500;
	}

	.reminder-picker select:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
		border-radius: 0.25rem;
	}

	.reminder-picker select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
