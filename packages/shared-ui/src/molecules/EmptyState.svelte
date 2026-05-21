<script lang="ts">
	import type { Snippet } from 'svelte';
	import Text from '../atoms/Text.svelte';
	import Button from '../atoms/Button.svelte';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	type Variant = 'default' | 'compact' | 'centered';

	interface Props {
		title: string;
		message?: string;
		actionLabel?: string;
		onAction?: () => void;
		secondaryActionLabel?: string;
		onSecondaryAction?: () => void;
		variant?: Variant;
		icon?: Snippet;
	}

	let {
		title,
		message,
		actionLabel,
		onAction,
		secondaryActionLabel,
		onSecondaryAction,
		variant = 'default',
		icon,
	}: Props = $props();
</script>

<div class="empty-state variant-{variant}">
	<div class="icon-wrap">
		{#if icon}
			{@render icon()}
		{:else}
			<DynamicIcon name="search" size="lg" ariaLabel="Leer" />
		{/if}
	</div>

	<Text as="p" weight="semibold">{title}</Text>

	{#if message}
		<p class="message">{message}</p>
	{/if}

	{#if actionLabel || secondaryActionLabel}
		<div class="actions">
			{#if secondaryActionLabel && onSecondaryAction}
				<Button variant="ghost" onclick={onSecondaryAction}>{secondaryActionLabel}</Button>
			{/if}
			{#if actionLabel && onAction}
				<Button variant="primary" onclick={onAction}>{actionLabel}</Button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-family: inherit;
	}

	.empty-state.variant-default {
		padding: 3rem 1.5rem;
	}

	.empty-state.variant-compact {
		padding: 1.5rem 1rem;
	}

	.empty-state.variant-centered {
		padding: 4rem 2rem;
	}

	.icon-wrap {
		margin-bottom: 1rem;
		color: hsl(var(--color-muted-foreground));
		opacity: 0.6;
	}

	.message {
		margin: 0.5rem 0 1rem 0;
		max-width: 24rem;
		font-size: 0.875rem;
		color: hsl(var(--color-muted-foreground));
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
</style>
