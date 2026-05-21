<script lang="ts">
	import Pill from './Pill.svelte';

	export interface PillTabOption {
		id: string;
		label?: string;
		title?: string;
		disabled?: boolean;
	}

	interface Props {
		options: PillTabOption[];
		value: string;
		onChange: (id: string) => void;
		sectionLabel?: string;
		ariaLabel?: string;
		/** v0.1.x-Compat: Right-Click-Handler. Heute ignoriert; managarten nutzt onContextMenu auf PillTabGroup-Configs. */
		onContextMenu?: (x: number, y: number) => void;
		/** v0.1.x-Compat: heute ignoriert. */
		size?: 'sm' | 'md' | number;
		/** v0.1.x-Compat: heute ignoriert. */
		class?: string;
		/** v0.1.x-Compat: Primary-Color für aktive Tabs (heute via Token primary). */
		primaryColor?: string;
	}

	let { options, value, onChange, sectionLabel, ariaLabel }: Props = $props();

	function handleClick(id: string, disabled?: boolean) {
		if (disabled || id === value) return;
		onChange(id);
	}
</script>

<div class="pill-tab-group" role="tablist" aria-label={ariaLabel ?? sectionLabel}>
	{#each options as option, i (option.id)}
		{#if i > 0}
			<span class="divider" aria-hidden="true"></span>
		{/if}
		<Pill
			size="sm"
			active={value === option.id}
			disabled={option.disabled}
			title={option.title ?? option.label}
			ariaLabel={option.label ?? option.title}
			onclick={() => handleClick(option.id, option.disabled)}
		>
			{#snippet children()}{option.label ?? option.id}{/snippet}
		</Pill>
	{/each}
</div>

<style>
	.pill-tab-group {
		display: inline-flex;
		align-items: center;
		gap: 0;
		padding: 0.125rem;
		background: hsl(var(--color-surface));
		border: 1px solid hsl(var(--color-border));
		border-radius: 9999px;
	}

	.divider {
		width: 1px;
		height: 1rem;
		background: hsl(var(--color-border));
		flex-shrink: 0;
	}
</style>
