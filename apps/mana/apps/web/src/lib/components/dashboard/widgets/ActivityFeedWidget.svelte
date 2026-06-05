<script lang="ts">
	import { getDateFnsLocale } from '$lib/i18n/format';
	/**
	 * ActivityFeedWidget — Recent timeBlock activity across all modules.
	 *
	 * Shows a chronological feed of recently created/updated timeBlocks.
	 * Reads directly from IndexedDB, auto-updates via liveQuery.
	 */

	import { _ } from 'svelte-i18n';
	import { useLiveQueryWithDefault } from '@mana/local-store/svelte';
	import { db } from '$lib/data/database';
	import { decryptRecords } from '$lib/data/crypto';
	import type { LocalTimeBlock, TimeBlockType } from '$lib/data/time-blocks/types';
	import { toTimeBlock } from '$lib/data/time-blocks/queries';
	import type { TimeBlock } from '$lib/data/time-blocks/types';
	import {
		CalendarBlank,
		CheckSquare,
		Timer,
		Lightning,
		Clock,
		Pulse,
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
	import { formatDistanceToNow } from 'date-fns';
	const MAX_ITEMS = 10;

	const recentQuery = useLiveQueryWithDefault(async () => {
		const locals = await db.table<LocalTimeBlock>('timeBlocks').toArray();
		const visible = locals.filter((b) => !b.deletedAt);
		const decrypted = await decryptRecords('timeBlocks', visible);
		return decrypted
			.map(toTimeBlock)
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
			.slice(0, MAX_ITEMS);
	}, [] as TimeBlock[]);

	let items = $derived(recentQuery.value ?? []);

	const typeIcons: Record<string, typeof CalendarBlank> = {
		event: CalendarBlank,
		task: CheckSquare,
		timeEntry: Timer,
		focus: Lightning,
		break: Clock,
		body: Barbell,
		watering: Drop,
		sleep: Moon,
		practice: GraduationCap,
		cycle: FlowerLotus,
		guide: Compass,
		visit: MapPin,
		study: BookOpen,
		listening: MusicNote,
		mood: SunHorizon,
		rehearsal: Presentation,
	};

	function timeAgo(iso: string): string {
		return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: getDateFnsLocale() });
	}

	function actionLabel(block: TimeBlock): string {
		if (block.isLive) return 'Läuft';
		if (block.linkedBlockId) return 'Erledigt';
		if (block.kind === 'scheduled') return 'Geplant';
		return 'Erfasst';
	}
</script>

<div>
	<div class="mb-3 flex items-center justify-between">
		<h3 class="flex items-center gap-2 text-lg font-semibold">
			<Pulse size={20} />
			{$_('dashboard.widgets.activity_feed.title', { default: 'Aktivität' })}
		</h3>
	</div>

	{#if recentQuery.loading}
		<div class="space-y-2">
			{#each Array(4) as _}
				<div class="h-8 animate-pulse rounded bg-surface-hover"></div>
			{/each}
		</div>
	{:else if items.length === 0}
		<div class="py-6 text-center">
			<Pulse size={32} class="mx-auto mb-2 text-muted-foreground" />
			<p class="text-sm text-muted-foreground">
				{$_('dashboard.widgets.activity_feed.empty', { default: 'Noch keine Aktivität' })}
			</p>
		</div>
	{:else}
		<div class="space-y-1">
			{#each items as block (block.id)}
				{@const Icon = typeIcons[block.type] ?? CalendarBlank}
				<div
					class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover"
				>
					<div
						class="flex h-6 w-6 flex-shrink-0 items-center justify-content-center rounded-full"
						class:animate-pulse={block.isLive}
						style="background: {block.color || '#6b7280'}20; color: {block.color || '#6b7280'}"
					>
						<Icon size={12} />
					</div>

					<div class="min-w-0 flex-1">
						<span class="truncate text-sm">{block.title}</span>
					</div>

					<div class="flex flex-shrink-0 flex-col items-end">
						<span class="text-[0.625rem] font-medium text-muted-foreground">
							{actionLabel(block)}
						</span>
						<span class="text-[0.5625rem] text-muted-foreground">
							{timeAgo(block.updatedAt)}
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
