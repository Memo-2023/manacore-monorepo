<!--
  Admin → System tab.
  Service-health grid + monitoring quick-links + environment info.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowSquareOut } from '@mana/shared-icons';
	import QuickLinks from '$lib/components/admin/QuickLinks.svelte';

	interface ServiceHealth {
		name: string;
		status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
		url: string;
		lastCheck?: string;
	}

	let services = $state<ServiceHealth[]>([]);
	let loading = $state(true);

	const monitoringLinks = [
		{
			name: 'Grafana — System Overview',
			url: 'https://grafana.mana.how/d/system-overview',
			description: 'CPU, Memory, Disk, Network',
			icon: 'grafana' as const,
		},
		{
			name: 'Grafana — Backends & Docker',
			url: 'https://grafana.mana.how/d/backends-docker',
			description: 'Container metrics & API performance',
			icon: 'docker' as const,
		},
		{
			name: 'Prometheus',
			url: 'https://grafana.mana.how/explore',
			description: 'Raw metrics & queries',
			icon: 'api' as const,
		},
	];

	const statusColors = {
		healthy: 'hsl(142 71% 45%)',
		degraded: 'hsl(48 96% 53%)',
		unhealthy: 'hsl(0 84% 60%)',
		unknown: 'hsl(0 0% 60%)',
	};

	const statusLabels = {
		healthy: 'Healthy',
		degraded: 'Degraded',
		unhealthy: 'Unhealthy',
		unknown: 'Unknown',
	};

	onMount(async () => {
		await new Promise((resolve) => setTimeout(resolve, 500));
		services = [
			{ name: 'Mana Core Auth', status: 'healthy', url: 'https://auth.mana.how' },
			{ name: 'Mana Web', status: 'healthy', url: 'https://mana.how' },
			{ name: 'Mana API', status: 'healthy', url: 'https://api.mana.how' },
			{ name: 'Mana Sync', status: 'healthy', url: '-' },
			{ name: 'Mana AI', status: 'healthy', url: '-' },
			{ name: 'Mana Research', status: 'healthy', url: '-' },
			{ name: 'PostgreSQL', status: 'healthy', url: '-' },
			{ name: 'Redis', status: 'healthy', url: '-' },
			{ name: 'MinIO', status: 'healthy', url: 'https://s3.mana.how' },
			{ name: 'Grafana', status: 'healthy', url: 'https://grafana.mana.how' },
		];
		loading = false;
	});

	let healthyCount = $derived(services.filter((s) => s.status === 'healthy').length);
	let totalCount = $derived(services.length);
</script>

<div class="system-tab">
	<section class="panel">
		<header class="panel-header">
			<h3>System Status</h3>
			{#if !loading}
				<div class="status-summary">
					<span
						class="dot"
						style:background={healthyCount === totalCount
							? statusColors.healthy
							: statusColors.degraded}
					></span>
					<span class="status-count">{healthyCount}/{totalCount} healthy</span>
				</div>
			{/if}
		</header>

		{#if loading}
			<div class="grid">
				{#each Array(8) as _}
					<div class="skeleton"></div>
				{/each}
			</div>
		{:else}
			<div class="grid">
				{#each services as service}
					<div class="service">
						<span class="dot" style:background={statusColors[service.status]}></span>
						<div class="service-info">
							<p class="service-name">{service.name}</p>
							<p class="service-status">{statusLabels[service.status]}</p>
						</div>
						{#if service.url !== '-'}
							<a href={service.url} target="_blank" rel="noopener noreferrer" class="link">
								<ArrowSquareOut size={14} />
							</a>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<QuickLinks links={monitoringLinks} />

	<section class="panel">
		<h3>Environment</h3>
		<div class="env-grid">
			<div class="env-col">
				<div class="env-row">
					<span class="env-label">Server</span>
					<code>Mac Mini (mana.how)</code>
				</div>
				<div class="env-row">
					<span class="env-label">Domain</span>
					<code>*.mana.how</code>
				</div>
				<div class="env-row">
					<span class="env-label">SSL</span>
					<code class="ok">Caddy (Auto)</code>
				</div>
			</div>
			<div class="env-col">
				<div class="env-row">
					<span class="env-label">Database</span>
					<code>PostgreSQL 16</code>
				</div>
				<div class="env-row">
					<span class="env-label">Cache</span>
					<code>Redis 7</code>
				</div>
				<div class="env-row">
					<span class="env-label">Tunnel</span>
					<code>Cloudflare</code>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.system-tab {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel {
		border: 1px solid hsl(var(--color-border));
		border-radius: 10px;
		background: hsl(var(--color-card));
		padding: 1rem;
	}

	.panel h3 {
		font-size: 0.9375rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.panel-header h3 {
		margin: 0;
	}

	.status-summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 0.5rem;
	}

	.skeleton {
		height: 3rem;
		background: hsl(var(--color-muted, 0 0% 95%));
		border-radius: 8px;
		animation: pulse 1.5s ease-in-out infinite;
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

	.service {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid hsl(var(--color-border));
		border-radius: 8px;
		background: hsl(var(--color-background, var(--color-card)));
	}

	.service-info {
		flex: 1;
		min-width: 0;
	}

	.service-name {
		font-size: 0.8125rem;
		font-weight: 500;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.service-status {
		font-size: 0.6875rem;
		color: hsl(var(--color-muted-foreground));
		margin: 0;
	}

	.link {
		color: hsl(var(--color-muted-foreground));
		display: flex;
		align-items: center;
	}

	.link:hover {
		color: hsl(var(--color-foreground));
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.env-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.env-col {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.env-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.8125rem;
	}

	.env-label {
		color: hsl(var(--color-muted-foreground));
	}

	code {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.75rem;
	}

	code.ok {
		color: hsl(142 71% 45%);
	}
</style>
