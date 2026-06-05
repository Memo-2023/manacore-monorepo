<script lang="ts">
	import { getDateFnsLocale } from '$lib/i18n/format';
	import { _ } from 'svelte-i18n';
	import { getContext, onMount, tick } from 'svelte';
	import { getDefaultCalendar, getCalendarColor } from '../queries';
	import type { Calendar } from '../types';
	import { format, addMinutes } from 'date-fns';
	import {
		X,
		Clock,
		CalendarBlank,
		MapPin,
		ArrowsClockwise,
		TextAlignLeft,
	} from '@mana/shared-icons';
	import ConflictWarning from './ConflictWarning.svelte';

	import type { TimeBlockType } from '$lib/data/time-blocks/types';
	import { CheckSquare, Timer } from '@mana/shared-icons';

	type QuickCreateType = 'event' | 'timeEntry';

	interface Props {
		startTime: Date;
		endTime: Date;
		position: { x: number; y: number };
		onSave: (data: {
			title: string;
			calendarId: string;
			startTime: string;
			endTime: string;
			isAllDay: boolean;
			location: string | null;
			description: string | null;
			recurrenceRule: string | null;
			blockType: QuickCreateType;
		}) => void;
		onClose: () => void;
	}

	let { startTime, endTime, position, onSave, onClose }: Props = $props();

	const calendarsCtx: { readonly value: Calendar[] } = getContext('calendars');

	let title = $state('');
	let location = $state('');
	let description = $state('');
	let blockType = $state<QuickCreateType>('event');
	let isAllDay = $state(false);
	let recurrenceRule = $state<string | null>(null);
	// svelte-ignore state_referenced_locally
	let startDateStr = $state(format(startTime, 'yyyy-MM-dd'));
	// svelte-ignore state_referenced_locally
	let startTimeStr = $state(format(startTime, 'HH:mm'));
	// svelte-ignore state_referenced_locally
	let endDateStr = $state(format(endTime, 'yyyy-MM-dd'));
	// svelte-ignore state_referenced_locally
	let endTimeStr = $state(format(endTime, 'HH:mm'));

	let titleInput: HTMLInputElement;
	let popoverEl: HTMLDivElement;
	let popoverPos = $state({ top: 0, left: 0 });

	const defaultCalendar = $derived(getDefaultCalendar(calendarsCtx.value));
	let calendarId = $state('');

	$effect(() => {
		if (defaultCalendar && !calendarId) {
			calendarId = defaultCalendar.id;
		}
	});

	const calendarColor = $derived(getCalendarColor(calendarsCtx.value, calendarId || ''));

	const RECURRENCE_OPTIONS = $derived([
		{ value: '', label: $_('calendar.recurrence.none') },
		{ value: 'FREQ=DAILY', label: $_('calendar.recurrence.daily') },
		{ value: 'FREQ=WEEKLY', label: $_('calendar.recurrence.weekly') },
		{ value: 'FREQ=WEEKLY;INTERVAL=2', label: $_('calendar.recurrence.every_2_weeks') },
		{ value: 'FREQ=MONTHLY', label: $_('calendar.recurrence.monthly') },
		{ value: 'FREQ=YEARLY', label: $_('calendar.recurrence.yearly') },
	]);

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!title.trim()) return;

		const start = isAllDay
			? new Date(`${startDateStr}T00:00:00`)
			: new Date(`${startDateStr}T${startTimeStr}`);
		const end = isAllDay
			? new Date(`${endDateStr}T23:59:59`)
			: new Date(`${endDateStr}T${endTimeStr}`);

		onSave({
			title: title.trim(),
			calendarId,
			startTime: start.toISOString(),
			endTime: end.toISOString(),
			isAllDay,
			location: location.trim() || null,
			description: description.trim() || null,
			recurrenceRule: recurrenceRule || null,
			blockType,
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	onMount(async () => {
		await tick();
		if (popoverEl) {
			const rect = popoverEl.getBoundingClientRect();
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			let left = position.x + 12;
			let top = position.y - 100;

			if (left + rect.width > vw - 16) left = position.x - rect.width - 12;
			if (left < 16) left = 16;
			if (top < 16) top = 16;
			if (top + rect.height > vh - 16) top = vh - rect.height - 16;

			popoverPos = { top, left };
		}
		titleInput?.focus();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop (transparent - allows seeing calendar) -->
<div class="popover-backdrop" onclick={onClose} role="presentation" tabindex="-1"></div>

<!-- Popover -->
<div
	bind:this={popoverEl}
	class="popover"
	style="top: {popoverPos.top}px; left: {popoverPos.left}px;"
	role="dialog"
	aria-label={$_('calendar.quick_event.aria_dialog')}
>
	<!-- Color accent bar -->
	<div class="accent-bar" style="background-color: {calendarColor};"></div>

	<form onsubmit={handleSubmit}>
		<!-- Header -->
		<div class="popover-header">
			<span class="header-title">{$_('calendar.quick_event.header_new')}</span>
			<button type="button" class="close-btn" onclick={onClose} aria-label={$_('common.close')}>
				<X size={16} />
			</button>
		</div>

		<!-- Scrollable content -->
		<div class="popover-content">
			<!-- Title input -->
			<input
				bind:this={titleInput}
				bind:value={title}
				type="text"
				placeholder={$_('calendar.quick_event.placeholder_title')}
				class="title-input"
				required
			/>

			<!-- Type selector -->
			<div class="type-pills">
				<button
					type="button"
					class="type-pill"
					class:active={blockType === 'event'}
					onclick={() => (blockType = 'event')}
				>
					<CalendarBlank size={12} />
					{$_('calendar.quick_event.type_event')}
				</button>
				<button
					type="button"
					class="type-pill"
					class:active={blockType === 'timeEntry'}
					onclick={() => (blockType = 'timeEntry')}
				>
					<Timer size={12} />
					{$_('calendar.quick_event.type_time_entry')}
				</button>
			</div>

			<!-- Calendar pills -->
			{#if calendarsCtx.value.length > 1 && blockType === 'event'}
				<div class="calendar-pills">
					{#each calendarsCtx.value as cal (cal.id)}
						<button
							type="button"
							class="calendar-pill"
							class:active={calendarId === cal.id}
							onclick={() => (calendarId = cal.id)}
						>
							<span class="pill-dot" style="background-color: {cal.color || '#3b82f6'}"></span>
							<span class="pill-name">{cal.name}</span>
						</button>
					{/each}
				</div>
			{/if}

			<!-- All-day toggle -->
			<label class="form-row clickable">
				<CalendarBlank size={16} class="row-icon-el" />
				<span class="row-label">{$_('calendar.event.allDay')}</span>
				<input type="checkbox" bind:checked={isAllDay} class="toggle-cb" />
			</label>

			<!-- Start date/time -->
			<div class="form-row">
				<Clock size={16} class="row-icon-el" />
				<div class="datetime-fields">
					<div class="dt-group">
						<span class="dt-label">{$_('calendar.event.start')}</span>
						<input type="date" bind:value={startDateStr} class="dt-input" />
						{#if !isAllDay}
							<input type="time" bind:value={startTimeStr} class="dt-input time" />
						{/if}
					</div>
					<div class="dt-group">
						<span class="dt-label">{$_('calendar.event.end')}</span>
						<input type="date" bind:value={endDateStr} class="dt-input" />
						{#if !isAllDay}
							<input type="time" bind:value={endTimeStr} class="dt-input time" />
						{/if}
					</div>
				</div>
			</div>

			{#if !isAllDay && startDateStr && startTimeStr && endTimeStr}
				<ConflictWarning
					startDate="{startDateStr}T{startTimeStr}:00"
					endDate="{endDateStr}T{endTimeStr}:00"
				/>
			{/if}

			<!-- Recurrence -->
			<div class="form-row">
				<ArrowsClockwise size={16} class="row-icon-el" />
				<select
					class="field-select"
					value={recurrenceRule || ''}
					onchange={(e) => {
						const v = (e.target as HTMLSelectElement).value;
						recurrenceRule = v || null;
					}}
				>
					{#each RECURRENCE_OPTIONS as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<!-- Location -->
			<div class="form-row">
				<MapPin size={16} class="row-icon-el" />
				<input
					bind:value={location}
					type="text"
					placeholder={$_('calendar.quick_event.placeholder_location')}
					class="field-input"
				/>
			</div>

			<!-- Description -->
			<div class="form-row">
				<TextAlignLeft size={16} class="row-icon-el" />
				<textarea
					bind:value={description}
					placeholder={$_('calendar.quick_event.placeholder_description')}
					rows="2"
					class="field-input field-textarea"
				></textarea>
			</div>
		</div>

		<!-- Actions -->
		<div class="popover-actions">
			<button type="button" onclick={onClose} class="cancel-btn">{$_('common.cancel')}</button>
			<button
				type="submit"
				disabled={!title.trim()}
				class="save-btn"
				style="background-color: {calendarColor};"
			>
				{$_('common.save')}
			</button>
		</div>
	</form>
</div>

<style>
	.popover-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.popover {
		position: fixed;
		z-index: 100;
		width: 340px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		background: hsl(var(--color-card));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.75rem;
		box-shadow:
			0 20px 40px -8px rgba(0, 0, 0, 0.2),
			0 8px 16px -4px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		animation: popover-in 120ms ease-out;
	}

	@keyframes popover-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.accent-bar {
		height: 4px;
		width: 100%;
		flex-shrink: 0;
	}

	.popover-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 0.875rem;
		border-bottom: 1px solid hsl(var(--color-border) / 0.5);
		flex-shrink: 0;
	}

	.header-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--color-foreground));
	}

	.close-btn {
		padding: 0.25rem;
		border: none;
		background: none;
		color: hsl(var(--color-muted-foreground));
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.close-btn:hover {
		background: hsl(var(--color-muted));
	}

	.type-pills {
		display: flex;
		gap: 0.25rem;
	}
	.type-pill {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid hsl(var(--color-border));
		border-radius: 9999px;
		background: transparent;
		font-size: 0.6875rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
		cursor: pointer;
		transition: all 0.15s;
	}
	.type-pill:hover {
		background: hsl(var(--color-muted));
	}
	.type-pill.active {
		background: hsl(var(--color-primary) / 0.1);
		border-color: hsl(var(--color-primary) / 0.3);
		color: hsl(var(--color-primary));
	}

	.popover-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.title-input {
		width: 100%;
		border: none;
		background: none;
		font-size: 1rem;
		font-weight: 600;
		color: hsl(var(--color-foreground));
		outline: none;
		padding: 0;
	}

	.title-input::placeholder {
		color: hsl(var(--color-muted-foreground) / 0.5);
		font-weight: 400;
	}

	/* Calendar pills */
	.calendar-pills {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.calendar-pill {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		border: 1px solid hsl(var(--color-border));
		background: none;
		font-size: 0.6875rem;
		color: hsl(var(--color-foreground));
		cursor: pointer;
		transition: all 0.1s;
	}

	.calendar-pill.active {
		border-color: hsl(var(--color-primary) / 0.5);
		background: hsl(var(--color-primary) / 0.1);
	}

	.pill-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.pill-name {
		font-weight: 500;
	}

	/* Form rows */
	.form-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.25rem 0;
	}

	.form-row.clickable {
		cursor: pointer;
		align-items: center;
		border-radius: 0.375rem;
		padding: 0.375rem 0.25rem;
	}

	.form-row.clickable:hover {
		background: hsl(var(--color-muted) / 0.5);
	}

	.form-row :global(.row-icon-el) {
		flex-shrink: 0;
		color: hsl(var(--color-muted-foreground));
		margin-top: 0.125rem;
	}

	.row-label {
		flex: 1;
		font-size: 0.8125rem;
		color: hsl(var(--color-foreground));
	}

	.toggle-cb {
		accent-color: hsl(var(--color-primary));
	}

	/* Datetime fields */
	.datetime-fields {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.dt-group {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.dt-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
		width: 2.75rem;
		flex-shrink: 0;
	}

	.dt-input {
		flex: 1;
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.375rem;
		background: hsl(var(--color-background));
		padding: 0.25rem 0.375rem;
		font-size: 0.75rem;
		color: hsl(var(--color-foreground));
		outline: none;
	}

	.dt-input:focus {
		border-color: hsl(var(--color-primary));
	}

	.dt-input.time {
		max-width: 5rem;
	}

	/* Select & input fields */
	.field-select,
	.field-input {
		flex: 1;
		border: none;
		border-bottom: 1px solid hsl(var(--color-border) / 0.5);
		background: none;
		font-size: 0.8125rem;
		color: hsl(var(--color-foreground));
		outline: none;
		padding: 0.25rem 0;
	}

	.field-select:focus,
	.field-input:focus {
		border-bottom-color: hsl(var(--color-primary));
	}

	.field-select {
		cursor: pointer;
	}

	.field-textarea {
		resize: none;
		font-family: inherit;
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: hsl(var(--color-muted-foreground) / 0.4);
	}

	/* Actions */
	.popover-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.375rem;
		padding: 0.625rem 0.875rem;
		border-top: 1px solid hsl(var(--color-border) / 0.5);
		flex-shrink: 0;
	}

	.cancel-btn {
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
	}

	.cancel-btn:hover {
		background: hsl(var(--color-muted));
	}

	.save-btn {
		font-size: 0.8125rem;
		font-weight: 600;
		color: white;
		border: none;
		cursor: pointer;
		padding: 0.375rem 1rem;
		border-radius: 0.375rem;
		transition: opacity 0.15s;
	}

	.save-btn:hover {
		opacity: 0.9;
	}

	.save-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Mobile: bottom sheet */
	@media (max-width: 640px) {
		.popover {
			position: fixed;
			top: auto !important;
			left: 0 !important;
			right: 0;
			bottom: 0;
			width: 100%;
			max-height: 85vh;
			border-radius: 1rem 1rem 0 0;
			animation: slide-up 200ms ease-out;
		}

		@keyframes slide-up {
			from {
				transform: translateY(100%);
			}
			to {
				transform: translateY(0);
			}
		}

		.popover-backdrop {
			background: rgba(0, 0, 0, 0.3);
		}
	}
</style>
