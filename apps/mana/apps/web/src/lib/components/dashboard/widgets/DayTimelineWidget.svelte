<script lang="ts">
	/**
	 * DayTimelineWidget — "Mein Tag" chronological timeline
	 *
	 * Shows all timeBlocks for today across all modules (events, tasks, time entries).
	 * The key showcase of the Unified Time Model.
	 */

	import { _ } from 'svelte-i18n';
	import { useLiveQueryWithDefault } from '@mana/local-store/svelte';
	import { db } from '$lib/data/database';
	import { decryptRecords } from '$lib/data/crypto';
	import type { LocalTimeBlock, TimeBlockType } from '$lib/data/time-blocks/types';
	import { toTimeBlock, getBlockDuration } from '$lib/data/time-blocks/queries';
	import type { TimeBlock } from '$lib/data/time-blocks/types';
	import {
		CalendarBlank,
		CheckSquare,
		Timer,
		Lightning,
		Clock,
		Barbell,
		Drop,
		Moon,
		GraduationCap,
		FlowerLotus,
		Compass,
		MapPin,
		BookOpen,
		MusicNote,
		SunHorizon,
		Presentation,
	} from '@mana/shared-icons';
	import { format } from 'date-fns';

	const todayStr = new Date().toISOString().split('T')[0];
	const todayStart = `${todayStr}T00:00:00.000Z`;
	const todayEnd = `${todayStr}T23:59:59.999Z`;

	const blocksQuery = useLiveQueryWithDefault(async () => {
		const locals = await db
			.table<LocalTimeBlock>('timeBlocks')
			.where('startDate')
			.between(todayStart, todayEnd, true, true)
			.toArray();
		const visible = locals.filter((b) => !b.deletedAt);
		const decrypted = await decryptRecords('timeBlocks', visible);
		return decrypted.map(toTimeBlock).sort((a, b) => a.startDate.localeCompare(b.startDate));
	}, [] as TimeBlock[]);

	let blocks = $derived(blocksQuery.value ?? []);

	// Summary stats
	let totalMinutes = $derived(blocks.reduce((sum, b) => sum + getBlockDuration(b) / 60, 0));
	let typeCounts = $derived(() => {
		const counts = new Map<TimeBlockType, number>();
		for (const b of blocks) {
			counts.set(b.type, (counts.get(b.type) ?? 0) + 1);
		}
		return counts;
	});

	const MAX_DISPLAY = 8;
	let displayedBlocks = $derived(blocks.slice(0, MAX_DISPLAY));
	let remainingCount = $derived(Math.max(0, blocks.length - MAX_DISPLAY));

	const typeConfig: Record<string, { icon: typeof CalendarBlank; label: string }> = {
		event: { icon: CalendarBlank, label: 'Termin' },
		task: { icon: CheckSquare, label: 'Aufgabe' },
		timeEntry: { icon: Timer, label: 'Zeiterfassung' },
		focus: { icon: Lightning, label: 'Fokus' },
		break: { icon: Clock, label: 'Pause' },
		body: { icon: Barbell, label: 'Training' },
		watering: { icon: Drop, label: 'Gießen' },
		sleep: { icon: Moon, label: 'Schlaf' },
		practice: { icon: GraduationCap, label: 'Übung' },
		cycle: { icon: FlowerLotus, label: 'Zyklus' },
		guide: { icon: Compass, label: 'Guide' },
		visit: { icon: MapPin, label: 'Besuch' },
		study: { icon: BookOpen, label: 'Lernen' },
		listening: { icon: MusicNote, label: 'Musik' },
		mood: { icon: SunHorizon, label: 'Stimmung' },
		rehearsal: { icon: Presentation, label: 'Probe' },
	};

	function formatBlockTime(block: TimeBlock): string {
		const start = format(new Date(block.startDate), 'HH:mm');
		if (block.isLive) return `${start} — jetzt`;
		if (!block.endDate) return start;
		const end = format(new Date(block.endDate), 'HH:mm');
		return `${start} — ${end}`;
	}

	function formatDuration(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (h === 0) return `${m}m`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}m`;
	}
</script>

<div>
	<div class="mb-3 flex items-center justify-between">
		<h3 class="flex items-center gap-2 text-lg font-semibold">
			<span><Clock size={20} /></span>
			{$_('dashboard.widgets.day_timeline.title', { default: 'Mein Tag' })}
		</h3>
		{#if blocks.length > 0}
			<span class="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
				{blocks.length}
			</span>
		{/if}
	</div>

	{#if blocksQuery.loading}
		<div class="space-y-2">
			{#each Array(4) as _}
				<div class="h-10 animate-pulse rounded bg-surface-hover"></div>
			{/each}
		</div>
	{:else if blocks.length === 0}
		<div class="py-6 text-center">
			<div class="mb-2 text-3xl"><Clock size={32} /></div>
			<p class="text-sm text-muted-foreground">
				{$_('dashboard.widgets.day_timeline.empty', { default: 'Noch nichts heute' })}
			</p>
		</div>
	{:else}
		<!-- Summary bar -->
		{#if totalMinutes > 0}
			<div class="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
				<span>{formatDuration(totalMinutes * 60)} erfasst</span>
				{#each [...typeCounts().entries()] as [type, count]}
					{@const cfg = typeConfig[type]}
					{#if cfg}
						{@const Icon = cfg.icon}
						<span class="flex items-center gap-1">
							<Icon size={12} />
							{count}
						</span>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Timeline -->
		<div class="space-y-1">
			{#each displayedBlocks as block (block.id)}
				{@const cfg = typeConfig[block.type] ?? typeConfig.event}
				{@const duration = getBlockDuration(block)}
				{@const Icon = cfg.icon}
				<div
					class="flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-surface-hover"
				>
					<!-- Color dot + icon -->
					<div class="mt-0.5 flex flex-shrink-0 items-center gap-1.5">
						<div
							class="h-2.5 w-2.5 rounded-full"
							class:animate-pulse={block.isLive}
							style="background-color: {block.color || '#6b7280'}"
						></div>
						<Icon size={14} class="text-muted-foreground" />
					</div>

					<!-- Content -->
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{block.title}</p>
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<span>{formatBlockTime(block)}</span>
							{#if duration > 0}
								<span>{formatDuration(duration)}</span>
							{/if}
							{#if block.isLive}
								<span class="rounded bg-green-500/20 px-1 text-green-600">live</span>
							{/if}
						</div>
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
