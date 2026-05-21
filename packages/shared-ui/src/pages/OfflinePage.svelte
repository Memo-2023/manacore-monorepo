<script lang="ts">
	import { onMount } from 'svelte';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';
	import Spinner from '../atoms/Spinner.svelte';

	interface Props {
		appName: string;
		offlineMessage: string;
		homeHref?: string;
		/** v0.1.x-Compat: Akzent-Farbe (heute ignoriert — der primary-Token bestimmt das). */
		accentColor?: string;
	}

	let { appName, offlineMessage, homeHref = '/' }: Props = $props();

	let isOnline = $state(false);

	onMount(() => {
		isOnline = navigator.onLine;

		const handleOnline = () => {
			isOnline = true;
			setTimeout(() => {
				window.location.href = homeHref;
			}, 1000);
		};

		const handleOffline = () => {
			isOnline = false;
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

<svelte:head>
	<title>Offline – {appName}</title>
</svelte:head>

<div class="offline-page">
	<div class="card">
		<div class="icon-wrap" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-.354-7.072L8.95 7.636m1.414 5.657L7.535 16.12m8.485 0a5 5 0 01-7.07 0"
				/>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
			</svg>
		</div>

		<h1>{isOnline ? 'Verbindung wiederhergestellt!' : 'Du bist offline'}</h1>

		<p class="message">
			{#if isOnline}
				Du wirst gleich weitergeleitet …
			{:else}
				{offlineMessage}
			{/if}
		</p>

		{#if !isOnline}
			<div class="actions">
				<a href={homeHref} class="primary-link">
					<DynamicIcon name="home" size="md" />
					Zur Startseite
				</a>
				<button type="button" onclick={() => window.location.reload()} class="secondary-btn">
					Erneut versuchen
				</button>
			</div>
		{:else}
			<div class="redirecting">
				<Spinner size="sm" tone="inherit" />
				<span>Weiterleitung …</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.offline-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: hsl(var(--color-background));
		color: hsl(var(--color-foreground));
	}

	.card {
		text-align: center;
		max-width: 28rem;
	}

	.icon-wrap {
		display: flex;
		justify-content: center;
		margin-bottom: 2rem;
		color: hsl(var(--color-muted-foreground));
	}

	.icon-wrap svg {
		width: 6rem;
		height: 6rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		color: hsl(var(--color-foreground));
	}

	.message {
		color: hsl(var(--color-muted-foreground));
		margin: 0 0 2rem 0;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: stretch;
	}

	.primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-weight: 500;
		color: hsl(var(--color-primary-foreground));
		background: hsl(var(--color-primary));
		border-radius: 0.5rem;
		text-decoration: none;
		transition: background-color 120ms;
		font-family: inherit;
	}

	.primary-link:hover {
		background: hsl(var(--color-primary) / 0.9);
	}

	.primary-link:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.secondary-btn {
		display: block;
		width: 100%;
		padding: 0.75rem 1.5rem;
		color: hsl(var(--color-muted-foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		font: inherit;
		transition: color 120ms;
	}

	.secondary-btn:hover {
		color: hsl(var(--color-foreground));
	}

	.secondary-btn:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
		border-radius: 0.25rem;
	}

	.redirecting {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: hsl(var(--color-success));
	}
</style>
