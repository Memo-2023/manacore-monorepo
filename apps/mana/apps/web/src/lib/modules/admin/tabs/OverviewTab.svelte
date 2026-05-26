<!--
  Admin → Overview tab.
  Stats grid + security (last 7d) + monitoring quick-links.
  Extracted from the former admin/ListView.svelte so it can render as
  one of four tabs alongside Users, System, User Data.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import StatCard from '$lib/components/admin/StatCard.svelte';
	import QuickLinks from '$lib/components/admin/QuickLinks.svelte';
	import { adminService, type AdminStats } from '$lib/api/services/admin';

	let stats = $state<AdminStats | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const quickLinks = [
		{
			name: 'Grafana Dashboard',
			url: 'https://grafana.mana.how',
			description: 'System & Backend Metrics',
			icon: 'grafana' as const,
		},
		{
			name: 'Docker Dashboard',
			url: 'https://grafana.mana.how/d/backends-docker',
			description: 'Container Metrics',
			icon: 'docker' as const,
		},
		{
			name: 'System Overview',
			url: 'https://grafana.mana.how/d/system-overview',
			description: 'CPU, Memory, Disk',
			icon: 'grafana' as const,
		},
	];

	onMount(async () => {
		const result = await adminService.getStats();
		if (result.error) {
			error = result.error;
		} else {
			stats = result.data;
		}
		loading = false;
	});

	let userGrowthPercent = $derived(
		stats
			? Math.round((stats.newUsers7d / Math.max(stats.totalUsers - stats.newUsers7d, 1)) * 100)
			: 0
	);
</script>

<div class="overview">
	<div class="stats-grid">
		<StatCard title="Total Users" value={stats?.totalUsers ?? '-'} icon="users" {loading} />
		<StatCard
			title="New Users (7d)"
			value={stats?.newUsers7d ?? '-'}
			change={userGrowthPercent}
			changeLabel="vs previous"
			icon="users"
			{loading}
		/>
		<StatCard
			title="Active Sessions"
			value={stats?.activeSessions ?? '-'}
			icon="activity"
			{loading}
		/>
		<StatCard
			title="Unique Users (24h)"
			value={stats?.uniqueUsers24h ?? '-'}
			icon="clock"
			{loading}
		/>
	</div>

	<div class="panels">
		<div class="panel">
			<h3 class="panel-title">Security (Last 7 Days)</h3>
			{#if loading}
				<div class="loading-rows">
					<div class="loading-bar"></div>
					<div class="loading-bar short"></div>
				</div>
			{:else if stats}
				<div class="security-rows">
					<div class="security-row">
						<div class="security-label">
							<span class="dot green"></span>
							<span>Successful Logins</span>
						</div>
						<span class="security-value">{stats.loginSuccess7d}</span>
					</div>
					<div class="security-row">
						<div class="security-label">
							<span class="dot red"></span>
							<span>Failed Logins</span>
						</div>
						<span class="security-value">{stats.loginFailed7d}</span>
					</div>
					<div class="security-divider"></div>
					<div class="security-row">
						<span class="security-muted">Success Rate</span>
						<span class="security-rate">
							{stats.loginSuccess7d + stats.loginFailed7d > 0
								? Math.round(
										(stats.loginSuccess7d / (stats.loginSuccess7d + stats.loginFailed7d)) * 100
									)
								: '—'}%
						</span>
					</div>
				</div>
			{/if}
		</div>

		<QuickLinks links={quickLinks} />
	</div>

	{#if error}
		<div class="error-box"><p>{error}</p></div>
	{/if}
</div>

<style>
	.overview {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.625rem;
	}
	.panels {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.75rem;
	}
	.panel {
		padding: 0.875rem;
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.625rem;
		background: hsl(var(--color-card));
	}
	.panel-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: hsl(var(--color-foreground));
		margin: 0 0 0.75rem;
	}
	.loading-rows {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.loading-bar {
		height: 0.875rem;
		background: hsl(var(--color-muted) / 0.3);
		border-radius: 0.25rem;
		animation: pulse 1.5s ease-in-out infinite;
	}
	.loading-bar.short {
		width: 75%;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	.security-rows {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}
	.security-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.security-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}
	.dot.green {
		background: hsl(142 71% 45%);
	}
	.dot.red {
		background: hsl(0 84% 60%);
	}
	.security-value {
		font-family: monospace;
		font-size: 0.8125rem;
	}
	.security-divider {
		border-top: 1px solid hsl(var(--color-border));
		padding-top: 0.375rem;
	}
	.security-muted {
		font-size: 0.8125rem;
		color: hsl(var(--color-muted-foreground));
	}
	.security-rate {
		font-size: 0.8125rem;
		font-weight: 500;
		color: hsl(142 71% 45%);
	}
	.error-box {
		padding: 0.75rem;
		border: 1px solid hsl(0 84% 60% / 0.3);
		border-radius: 0.5rem;
		background: hsl(0 84% 60% / 0.08);
	}
	.error-box p {
		font-size: 0.8125rem;
		color: hsl(0 84% 60%);
		margin: 0;
	}
</style>
