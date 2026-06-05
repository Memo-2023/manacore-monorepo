<script lang="ts">
	import { formatDate, formatTime } from '$lib/i18n/format';
	/**
	 * CalendarEventsWidget - Upcoming timeBlocks (local-first)
	 *
	 * Shows events, tasks, and time entries from the next 7 days.
	 * Reads directly from the timeBlocks table via cross-app query.
	 * Reactive: auto-updates when data changes (sync, other tabs).
	 */

	import { _ } from 'svelte-i18n';
	import { useUpcomingEvents } from '$lib/data/cross-app-queries';
	import type { LocalTimeBlock } from '$lib/data/time-blocks/types';
	import { CalendarBlank, CheckSquare, Timer } from '@mana/shared-icons';

	const events = useUpcomingEvents(7);

	const MAX_DISPLAY = 5;

	const typeIcons: Record<string, typeof CalendarBlank> = {
		event: CalendarBlank,
		task: CheckSquare,
		timeEntry: Timer,
	};

	function formatEventTime(block: LocalTimeBlock): string {
		const start = new Date(block.startDate);
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		let dateStr = '';
		if (start.toDateString() === today.toDateString()) {
			dateStr = 'Heute';
		} else if (start.toDateString() === tomorrow.toDateString()) {
			dateStr = 'Morgen';
		} else {
			dateStr = formatDate(start, {
				weekday: 'short',
				day: 'numeric',
				month: 'short',
			});
		}

		if (block.allDay) {
			return dateStr;
		}

		const timeStr = formatTime(start, { hour: '2-digit', minute: '2-digit' });
		return `${dateStr}, ${timeStr}`;
	}

	const displayedEvents = $derived((events.value ?? []).slice(0, MAX_DISPLAY));
	const remainingCount = $derived(Math.max(0, (events.value ?? []).length - MAX_DISPLAY));
</script>

<div>
	<div class="mb-3 flex items-center justify-between">
		<h3 class="flex items-center gap-2 text-lg font-semibold">
			<span><CalendarBlank size={20} /></span>
			{$_('dashboard.widgets.calendar.title')}
		</h3>
		{#if (events.value ?? []).length > 0}
			<span class="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
				{(events.value ?? []).length}
			</span>
		{/if}
	</div>

	{#if events.loading}
		<div class="space-y-2">
			{#each Array(4) as _}
				<div class="h-10 animate-pulse rounded bg-surface-hover"></div>
			{/each}
		</div>
	{:else if (events.value ?? []).length === 0}
		<div class="py-6 text-center">
			<div class="mb-2 text-3xl"><CalendarBlank size={32} /></div>
			<p class="text-sm text-muted-foreground">
				{$_('dashboard.widgets.calendar.empty')}
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each displayedEvents as block (block.id)}
				{@const TypeIcon = typeIcons[block.type] ?? CalendarBlank}
				<div class="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-hover">
					<div
						class="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
						class:animate-pulse={block.isLive}
						style="background-color: {block.color || '#3B82F6'}"
					></div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1.5">
							<TypeIcon size={12} class="text-muted-foreground" />
							<p class="truncate text-sm font-medium">{block.title}</p>
						</div>
						<p class="text-xs text-muted-foreground">{formatEventTime(block)}</p>
						{#if block.isLive}
							<span class="text-xs text-green-600">live</span>
						{/if}
					</div>
				</div>
			{/each}

			{#if remainingCount > 0}
				<a
					href="/calendar"
					class="block rounded-lg py-2 text-center text-sm text-primary hover:bg-primary/5"
				>
					+{remainingCount} weitere
				</a>
			{/if}
		</div>
	{/if}
</div>
