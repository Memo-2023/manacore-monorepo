<script lang="ts">
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	type Status = null | 'online' | 'busy' | 'offline';

	interface Props {
		name?: string;
		email?: string;
		imageUrl?: string;
		size?: Size;
		status?: Status;
		ariaLabel?: string;
	}

	let { name, email, imageUrl, size = 'md', status = null, ariaLabel }: Props = $props();

	const initials = $derived.by(() => {
		const source = (name ?? email ?? '').trim();
		if (!source) return '';
		// Bei Email: lokalen Teil nehmen, sonst Wort-Anfänge
		const base = source.includes('@') ? source.split('@')[0] : source;
		const parts = base.split(/[\s._-]+/).filter(Boolean);
		if (parts.length === 0) return '';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	});

	const label = $derived(ariaLabel ?? name ?? email ?? 'Avatar');
</script>

<span class="avatar size-{size}" aria-label={label} title={label}>
	{#if imageUrl}
		<img src={imageUrl} alt="" loading="lazy" />
	{:else if initials}
		<span class="initials" aria-hidden="true">{initials}</span>
	{:else}
		<span class="placeholder" aria-hidden="true">
			<DynamicIcon name="user" size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'} />
		</span>
	{/if}

	{#if status}
		<span class="status status-{status}" aria-label={status}></span>
	{/if}
</span>

<style>
	.avatar {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 9999px;
		background: hsl(var(--color-muted));
		color: hsl(var(--color-foreground));
		font-family: inherit;
		font-weight: 600;
		text-transform: uppercase;
		overflow: visible;
	}

	.size-xs {
		width: 1.25rem;
		height: 1.25rem;
		font-size: 0.5625rem;
	}
	.size-sm {
		width: 1.75rem;
		height: 1.75rem;
		font-size: 0.6875rem;
	}
	.size-md {
		width: 2.25rem;
		height: 2.25rem;
		font-size: 0.8125rem;
	}
	.size-lg {
		width: 3rem;
		height: 3rem;
		font-size: 1rem;
	}
	.size-xl {
		width: 4rem;
		height: 4rem;
		font-size: 1.25rem;
	}

	img {
		width: 100%;
		height: 100%;
		border-radius: inherit;
		object-fit: cover;
		display: block;
	}

	.initials,
	.placeholder {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		border-radius: inherit;
	}

	.placeholder {
		color: hsl(var(--color-muted-foreground));
	}

	.status {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 30%;
		height: 30%;
		min-width: 0.5rem;
		min-height: 0.5rem;
		border-radius: 50%;
		border: 2px solid hsl(var(--color-background));
	}

	.status-online {
		background: hsl(var(--color-success));
	}
	.status-busy {
		background: hsl(var(--color-error));
	}
	.status-offline {
		background: hsl(var(--color-muted-foreground));
	}
</style>
