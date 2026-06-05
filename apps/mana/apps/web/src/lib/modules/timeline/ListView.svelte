<!--
  Timeline — Chronological day view of all timeBlocks.
  "What did I do today?" as a standalone page.
-->
<script lang="ts">
	import { getDateFnsLocale } from '$lib/i18n/format';
	import { _ } from 'svelte-i18n';
	import { useLiveQueryWithDefault } from '@mana/local-store/svelte';
	import { db } from '$lib/data/database';
	import type { LocalTimeBlock, TimeBlockType } from '$lib/data/time-blocks/types';
	import { toTimeBlock, getBlockDuration } from '$lib/data/time-blocks/queries';
	import type { TimeBlock } from '$lib/data/time-blocks/types';
	import {
		CaretLeft,
		CaretRight,
		CalendarBlank,
		CheckSquare,
		Timer,
		Lightning,
		Clock,
		Funnel,
	} from '@mana/shared-icons';
	import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';

	let currentDate = $state(new Date());
	let showFilters = $state(false);
	let visibleTypes = $state<Set<TimeBlockType>>(
		new Set(['event', 'task', 'timeEntry', 'focus', 'break'])
	);

	let dateStr = $derived(format(currentDate, 'yyyy-MM-dd'));
	let dayStart = $derived(`${dateStr}T00:00:00.000Z`);
	let dayEnd = $derived(`${dateStr}T23:59:59.999Z`);

	const blocksQuery = useLiveQueryWithDefault(async () => {
		const locals = await db
			.table<LocalTimeBlock>('timeBlocks')
			.where('startDate')
			.between(dayStart, dayEnd, true, true)
			.toArray();
		return locals
			.filter((b) => !b.deletedAt)
			.map(toTimeBlock)
			.sort((a, b) => a.startDate.localeCompare(b.startDate));
	}, [] as TimeBlock[]);

	let allBlocks = $derived(blocksQuery.value ?? []);
	let blocks = $derived(allBlocks.filter((b) => visibleTypes.has(b.type)));

	// Stats
	let totalSeconds = $derived(blocks.reduce((sum, b) => sum + getBlockDuration(b), 0));
	let liveBlock = $derived(blocks.find((b) => b.isLive));

	const typeConfig: {
		type: TimeBlockType;
		icon: typeof CalendarBlank;
		label: string;
		color: string;
	}[] = [
		{ type: 'event', icon: CalendarBlank, label: 'Termine', color: '#3b82f6' },
		{ type: 'task', icon: CheckSquare, label: 'Aufgaben', color: '#f59e0b' },
		{ type: 'timeEntry', icon: Timer, label: 'Zeiten', color: '#8b5cf6' },
		{ type: 'focus', icon: Lightning, label: 'Fokus', color: '#ef4444' },
	];

	function toggleType(type: TimeBlockType) {
		const next = new Set(visibleTypes);
		if (next.has(type)) next.delete(type);
		else next.add(type);
		visibleTypes = next;
	}

	function formatHeaderDate(date: Date): string {
		if (isToday(date)) return 'Heute';
		if (isTomorrow(date)) return 'Morgen';
		if (isYesterday(date)) return 'Gestern';
		return format(date, 'EEEE, d. MMMM yyyy', { locale: getDateFnsLocale() });
	}

	function formatBlockTime(block: TimeBlock): string {
		const start = format(new Date(block.startDate), 'HH:mm');
		if (block.isLive) return `${start} — jetzt`;
		if (!block.endDate) return start;
		return `${start} — ${format(new Date(block.endDate), 'HH:mm')}`;
	}

	function formatDuration(seconds: number): string {
		if (seconds === 0) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (h === 0) return `${m}m`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}m`;
	}

	function getTypeColor(type: TimeBlockType): string {
		return typeConfig.find((c) => c.type === type)?.color ?? '#6b7280';
	}
</script>

<div class="timeline-page">
	<header class="timeline-header">
		<div class="header-left">
			<h1 class="header-title">{formatHeaderDate(currentDate)}</h1>
			<div class="nav-buttons">
				<button onclick={() => (currentDate = subDays(currentDate, 1))} class="nav-btn">
					<CaretLeft size={18} />
				</button>
				<button onclick={() => (currentDate = new Date())} class="today-btn">Heute</button>
				<button onclick={() => (currentDate = addDays(currentDate, 1))} class="nav-btn">
					<CaretRight size={18} />
				</button>
			</div>
		</div>

		<div class="header-right">
			{#if totalSeconds > 0}
				<span class="total-duration">{formatDuration(totalSeconds)} erfasst</span>
			{/if}
			<button
				class="filter-btn"
				class:active={visibleTypes.size < 6}
				onclick={() => (showFilters = !showFilters)}
			>
				<Funnel size={16} />
			</button>
		</div>
	</header>

	{#if showFilters}
		<div class="filter-bar">
			{#each typeConfig as cfg}
				{@const active = visibleTypes.has(cfg.type)}
				{@const Icon = cfg.icon}
				<button class="filter-chip" class:active onclick={() => toggleType(cfg.type)}>
					<Icon size={14} />
					{cfg.label}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Timeline content -->
	<div class="timeline-content">
		{#if blocks.length === 0}
			<div class="empty">
				<Clock size={48} class="empty-icon" />
				<p>{isToday(currentDate) ? 'Noch nichts heute' : 'Keine Einträge an diesem Tag'}</p>
			</div>
		{:else}
			<div class="timeline-list">
				{#each blocks as block, i (block.id)}
					{@const duration = getBlockDuration(block)}
					{@const typeCfg = typeConfig.find((c) => c.type === block.type)}

					<div class="timeline-item" class:live={block.isLive}>
						<!-- Time column -->
						<div class="time-col">
							<span class="time-label">{format(new Date(block.startDate), 'HH:mm')}</span>
						</div>

						<!-- Dot + line -->
						<div class="dot-col">
							<div
								class="dot"
								class:live={block.isLive}
								style="background: {block.color || getTypeColor(block.type)}"
							></div>
							{#if i < blocks.length - 1}
								<div class="connector-line"></div>
							{/if}
						</div>

						<!-- Content -->
						<div class="content-col">
							<div class="item-header">
								{#if typeCfg}
									{@const TypeIcon = typeCfg.icon}
									<TypeIcon size={16} class="item-type-icon" />
								{/if}
								<span class="item-title">{block.title}</span>
								{#if block.linkedBlockId}
									<span class="linked-badge">erledigt</span>
								{/if}
								{#if block.isLive}
									<span class="live-badge">live</span>
								{/if}
							</div>

							<div class="item-meta">
								<span>{formatBlockTime(block)}</span>
								{#if duration > 0}
									<span class="duration-pill">{formatDuration(duration)}</span>
								{/if}
							</div>

							{#if block.description}
								<p class="item-description">{block.description}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.timeline-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: hsl(var(--color-background));
	}

	.timeline-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid hsl(var(--color-border));
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: hsl(var(--color-foreground));
		margin: 0;
	}

	.nav-buttons {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-btn {
		padding: 0.375rem;
		border: none;
		background: transparent;
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		color: hsl(var(--color-muted-foreground));
	}
	.nav-btn:hover {
		background: hsl(var(--color-muted));
		color: hsl(var(--color-foreground));
	}

	.today-btn {
		padding: 0.25rem 0.75rem;
		border: none;
		background: transparent;
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
	}
	.today-btn:hover {
		background: hsl(var(--color-muted));
		color: hsl(var(--color-foreground));
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.total-duration {
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
	}

	.filter-btn {
		padding: 0.375rem;
		border: 1px solid hsl(var(--color-border));
		background: transparent;
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
		color: hsl(var(--color-muted-foreground));
	}
	.filter-btn:hover {
		background: hsl(var(--color-muted));
	}
	.filter-btn.active {
		background: hsl(var(--color-primary) / 0.1);
		border-color: hsl(var(--color-primary) / 0.3);
		color: hsl(var(--color-primary));
	}

	.filter-bar {
		display: flex;
		gap: 0.375rem;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid hsl(var(--color-border));
	}

	.filter-chip {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.625rem;
		border: 1px solid hsl(var(--color-border));
		border-radius: 9999px;
		background: transparent;
		font-size: 0.75rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
		cursor: pointer;
	}
	.filter-chip:hover {
		background: hsl(var(--color-muted));
	}
	.filter-chip.active {
		background: hsl(var(--color-primary) / 0.1);
		border-color: hsl(var(--color-primary) / 0.3);
		color: hsl(var(--color-primary));
	}

	/* Timeline content */
	.timeline-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 4rem 0;
		color: hsl(var(--color-muted-foreground));
	}
	.empty p {
		font-size: 0.875rem;
	}

	.timeline-list {
		display: flex;
		flex-direction: column;
	}

	.timeline-item {
		display: flex;
		gap: 0;
		min-height: 3.5rem;
	}

	.timeline-item.live {
		background: hsl(var(--color-primary) / 0.03);
		border-radius: var(--radius-md, 8px);
	}

	/* Time column */
	.time-col {
		width: 3.5rem;
		flex-shrink: 0;
		padding-top: 0.75rem;
		text-align: right;
		padding-right: 0.75rem;
	}

	.time-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
		font-variant-numeric: tabular-nums;
	}

	/* Dot + connector */
	.dot-col {
		width: 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-top: 0.85rem;
		flex-shrink: 0;
		z-index: 1;
	}

	.dot.live {
		animation: pulse-dot 2s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%,
		100% {
			box-shadow: 0 0 0 0 currentColor;
		}
		50% {
			box-shadow: 0 0 0 4px currentColor;
			opacity: 0.3;
		}
	}

	.connector-line {
		width: 2px;
		flex: 1;
		background: hsl(var(--color-border));
		margin-top: 0.25rem;
	}

	/* Content */
	.content-col {
		flex: 1;
		padding: 0.5rem 0 1rem 0.5rem;
		min-width: 0;
	}

	.item-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.item-title {
		font-size: 0.9375rem;
		font-weight: 500;
		color: hsl(var(--color-foreground));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.linked-badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.0625rem 0.375rem;
		border-radius: 9999px;
		background: hsl(var(--color-success, 142 71% 45%) / 0.15);
		color: hsl(var(--color-success, 142 71% 45%));
		flex-shrink: 0;
	}

	.live-badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.0625rem 0.375rem;
		border-radius: 9999px;
		background: hsl(var(--color-primary) / 0.15);
		color: hsl(var(--color-primary));
		animation: pulse-badge 2s ease-in-out infinite;
		flex-shrink: 0;
	}

	@keyframes pulse-badge {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground));
		margin-top: 0.125rem;
	}

	.duration-pill {
		padding: 0 0.375rem;
		border-radius: 9999px;
		background: hsl(var(--color-muted));
		font-size: 0.6875rem;
	}

	.item-description {
		margin: 0.25rem 0 0;
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
		line-height: 1.4;
	}
</style>
