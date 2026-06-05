<!--
  Analytics — Zeit-Budget Dashboard
  Shows time breakdown, daily trends, and plan adherence.
-->
<script lang="ts">
	import { getDateFnsLocale } from '$lib/i18n/format';
	import { useLiveQueryWithDefault } from '@mana/local-store/svelte';
	import { db } from '$lib/data/database';
	import type { LocalTimeBlock } from '$lib/data/time-blocks/types';
	import { toTimeBlock } from '$lib/data/time-blocks/queries';
	import type { TimeBlock } from '$lib/data/time-blocks/types';
	import {
		breakdownByType,
		dailyStats,
		planAdherence,
		productiveStreak,
		type TimeBreakdown,
		type DailyStat,
	} from '$lib/data/time-blocks/analytics';
	import { Clock, TrendUp, Fire, Target } from '@mana/shared-icons';
	import { format, subDays } from 'date-fns';
	import { RoutePage } from '$lib/components/shell';
	import { _ } from 'svelte-i18n';

	let periodDays = $state(7);

	const rangeStart = $derived(subDays(new Date(), periodDays).toISOString());
	const rangeEnd = $derived(new Date().toISOString());

	const blocksQuery = useLiveQueryWithDefault(async () => {
		const locals = await db.table<LocalTimeBlock>('timeBlocks').toArray();
		return locals.filter((b) => !b.deletedAt).map(toTimeBlock);
	}, [] as TimeBlock[]);

	let allBlocks = $derived(blocksQuery.value ?? []);
	let periodBlocks = $derived(
		allBlocks.filter((b) => b.startDate >= rangeStart && b.startDate <= rangeEnd)
	);

	// Analytics
	let typeBreakdown = $derived(breakdownByType(periodBlocks));
	let daily = $derived(dailyStats(periodBlocks, periodDays));
	let adherence = $derived(planAdherence(periodBlocks));
	let streak = $derived(productiveStreak(allBlocks));

	let totalHours = $derived(
		Math.round((typeBreakdown.reduce((sum, t) => sum + t.totalSeconds, 0) / 3600) * 10) / 10
	);

	function formatHours(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.round((seconds % 3600) / 60);
		if (h === 0) return `${m}m`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}m`;
	}

	// Max daily seconds for bar scaling
	let maxDailySeconds = $derived(Math.max(1, ...daily.map((d) => d.totalSeconds)));
</script>

<RoutePage appId="timeline" backHref="/timeline">
	<div class="analytics-page">
		<header class="analytics-header">
			<h1 class="header-title">{$_('timeline.analytics.page_title')}</h1>
			<div class="period-selector">
				{#each [7, 14, 30] as days}
					<button
						class="period-btn"
						class:active={periodDays === days}
						onclick={() => (periodDays = days)}
					>
						{$_('timeline.analytics.period_days_short', { values: { n: days } })}
					</button>
				{/each}
			</div>
		</header>

		<div class="analytics-grid">
			<!-- Summary cards -->
			<div class="summary-row">
				<div class="stat-card">
					<Clock size={20} class="stat-icon" />
					<div class="stat-content">
						<span class="stat-value">{totalHours}h</span>
						<span class="stat-label">{$_('timeline.analytics.stat_total')}</span>
					</div>
				</div>
				<div class="stat-card">
					<Fire size={20} class="stat-icon" />
					<div class="stat-content">
						<span class="stat-value">{streak}</span>
						<span class="stat-label">{$_('timeline.analytics.stat_streak')}</span>
					</div>
				</div>
				<div class="stat-card">
					<Target size={20} class="stat-icon" />
					<div class="stat-content">
						<span class="stat-value">{adherence.adherencePercent}%</span>
						<span class="stat-label">{$_('timeline.analytics.stat_adherence')}</span>
					</div>
				</div>
				<div class="stat-card">
					<TrendUp size={20} class="stat-icon" />
					<div class="stat-content">
						<span class="stat-value">{periodBlocks.length}</span>
						<span class="stat-label">{$_('timeline.analytics.stat_entries')}</span>
					</div>
				</div>
			</div>

			<!-- Type breakdown (donut-like horizontal bars) -->
			<div class="card">
				<h2 class="card-title">{$_('timeline.analytics.section_breakdown')}</h2>
				{#if typeBreakdown.length === 0}
					<p class="empty-text">{$_('timeline.analytics.empty_no_data')}</p>
				{:else}
					<div class="breakdown-list">
						{#each typeBreakdown as item}
							<div class="breakdown-item">
								<div class="breakdown-header">
									<span class="breakdown-dot" style="background: {item.color}"></span>
									<span class="breakdown-label">{item.label}</span>
									<span class="breakdown-value">{formatHours(item.totalSeconds)}</span>
									<span class="breakdown-percent">{Math.round(item.percentage)}%</span>
								</div>
								<div class="breakdown-bar-bg">
									<div
										class="breakdown-bar"
										style="width: {item.percentage}%; background: {item.color}"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Daily bars -->
			<div class="card">
				<h2 class="card-title">{$_('timeline.analytics.section_daily')}</h2>
				<div class="daily-chart">
					{#each daily as day}
						{@const barHeight =
							maxDailySeconds > 0 ? (day.totalSeconds / maxDailySeconds) * 100 : 0}
						<div class="daily-col">
							<div class="daily-bar-container">
								<div class="daily-bar" style="height: {barHeight}%">
									{#if day.totalSeconds > 0}
										<span class="daily-value">{formatHours(day.totalSeconds)}</span>
									{/if}
								</div>
							</div>
							<span class="daily-label">
								{format(new Date(day.date), 'EEE', { locale: getDateFnsLocale() })}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Plan adherence -->
			{#if adherence.totalScheduled > 0}
				<div class="card">
					<h2 class="card-title">{$_('timeline.analytics.section_plan_vs_reality')}</h2>
					<div class="adherence-stats">
						<div class="adherence-item">
							<span class="adherence-value">{adherence.totalScheduled}</span>
							<span class="adherence-label">{$_('timeline.analytics.adherence_scheduled')}</span>
						</div>
						<div class="adherence-item">
							<span class="adherence-value">{adherence.totalCompleted}</span>
							<span class="adherence-label">{$_('timeline.analytics.adherence_completed')}</span>
						</div>
						<div class="adherence-item">
							<span class="adherence-value">{adherence.adherencePercent}%</span>
							<span class="adherence-label">{$_('timeline.analytics.adherence_percent')}</span>
						</div>
						{#if adherence.averageDelayMinutes > 0}
							<div class="adherence-item">
								<span class="adherence-value">{adherence.averageDelayMinutes}m</span>
								<span class="adherence-label">{$_('timeline.analytics.adherence_avg_delay')}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</RoutePage>

<style>
	.analytics-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: hsl(var(--color-background));
		overflow-y: auto;
	}

	.analytics-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid hsl(var(--color-border));
	}

	.header-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
	}

	.period-selector {
		display: flex;
		border: 1px solid hsl(var(--color-border));
		border-radius: var(--radius-md, 8px);
		overflow: hidden;
	}

	.period-btn {
		padding: 0.375rem 0.75rem;
		border: none;
		background: transparent;
		font-size: 0.8125rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
		cursor: pointer;
	}
	.period-btn:hover {
		color: hsl(var(--color-foreground));
	}
	.period-btn.active {
		background: hsl(var(--color-primary));
		color: hsl(var(--color-primary-foreground));
	}

	.analytics-grid {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* Summary cards */
	.summary-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	@media (max-width: 640px) {
		.summary-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-lg, 12px);
		border: 1px solid hsl(var(--color-border));
		background: hsl(var(--color-card));
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: hsl(var(--color-foreground));
	}

	.stat-label {
		font-size: 0.6875rem;
		color: hsl(var(--color-muted-foreground));
	}

	/* Cards */
	.card {
		padding: 1.25rem;
		border-radius: var(--radius-lg, 12px);
		border: 1px solid hsl(var(--color-border));
		background: hsl(var(--color-card));
	}

	.card-title {
		font-size: 0.9375rem;
		font-weight: 600;
		margin: 0 0 1rem;
		color: hsl(var(--color-foreground));
	}

	.empty-text {
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
		text-align: center;
		padding: 1rem 0;
	}

	/* Type breakdown */
	.breakdown-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.breakdown-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}

	.breakdown-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.breakdown-label {
		color: hsl(var(--color-foreground));
		font-weight: 500;
	}

	.breakdown-value {
		margin-left: auto;
		color: hsl(var(--color-foreground));
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.breakdown-percent {
		width: 2.5rem;
		text-align: right;
		color: hsl(var(--color-muted-foreground));
		font-size: 0.75rem;
	}

	.breakdown-bar-bg {
		height: 6px;
		border-radius: 3px;
		background: hsl(var(--color-muted));
		overflow: hidden;
	}

	.breakdown-bar {
		height: 100%;
		border-radius: 3px;
		transition: width 0.5s ease;
	}

	/* Daily chart */
	.daily-chart {
		display: flex;
		align-items: flex-end;
		gap: 0.375rem;
		height: 140px;
	}

	.daily-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		height: 100%;
	}

	.daily-bar-container {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
	}

	.daily-bar {
		width: 100%;
		background: hsl(var(--color-primary));
		border-radius: 4px 4px 0 0;
		min-height: 2px;
		transition: height 0.5s ease;
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}

	.daily-value {
		font-size: 0.5625rem;
		color: hsl(var(--color-primary-foreground));
		padding-top: 2px;
		white-space: nowrap;
	}

	.daily-label {
		font-size: 0.6875rem;
		color: hsl(var(--color-muted-foreground));
	}

	/* Adherence */
	.adherence-stats {
		display: flex;
		gap: 2rem;
	}

	.adherence-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.adherence-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: hsl(var(--color-foreground));
	}

	.adherence-label {
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground));
	}
</style>
