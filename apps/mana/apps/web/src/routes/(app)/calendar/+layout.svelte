<script lang="ts">
	import { setContext, onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { useAllCalendars, useAllCalendarItems } from '$lib/modules/calendar/queries';
	import { calendarViewStore } from '$lib/modules/calendar/stores/view.svelte';
	import { materializeRecurringBlocks } from '$lib/data/time-blocks/recurrence';

	let { children }: { children: Snippet } = $props();

	// Live queries — auto-update when IndexedDB changes (local writes, sync, other tabs)
	const allCalendars = useAllCalendars();
	const allCalendarItems = useAllCalendarItems();

	// Provide data to child components via Svelte context
	// calendarEvents now contains ALL timeBlock types (events, tasks, timeEntries)
	setContext('calendars', allCalendars);
	setContext('calendarEvents', allCalendarItems);

	// Initialize view preferences
	calendarViewStore.initialize();

	// Materialize recurring blocks for the next 30 days
	onMount(() => {
		materializeRecurringBlocks(30);
	});
</script>

{@render children()}
