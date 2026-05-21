<script lang="ts">
	import type { PillDropdownItem } from './PillDropdown.svelte';
	import Pill from './Pill.svelte';
	import DynamicIcon from '../atoms/DynamicIcon.svelte';

	interface Props {
		items: PillDropdownItem[];
		label?: string;
		/** Inline SVG path string for the leading label-pill icon. */
		iconSvg?: string;
		/** v0.1.x-Compat: Icon-Namen-String. Wird heute ignoriert; nutze iconSvg. */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		positioning?: 'fixed' | 'static';
	}

	let { items, label, iconSvg, positioning = 'static' }: Props = $props();

	type RenderElement =
		| { kind: 'item'; id: string; item: PillDropdownItem }
		| { kind: 'divider'; id: string }
		| { kind: 'section-label'; id: string; label: string }
		| { kind: 'group'; id: string; items: PillDropdownItem[] };

	const renderElements = $derived.by<RenderElement[]>(() => {
		const out: RenderElement[] = [];
		const emittedGroups = new Set<string>();

		const flat: PillDropdownItem[] = [];
		for (const item of items) {
			if (item.submenu && item.submenu.length > 0) {
				flat.push({ id: `${item.id}-section`, label: item.label, divider: true });
				for (const child of item.submenu) flat.push(child);
			} else {
				flat.push(item);
			}
		}

		for (const item of flat) {
			if (item.divider) {
				const hasLabel = !!item.label;
				out.push(
					hasLabel
						? { kind: 'section-label', id: item.id, label: item.label }
						: { kind: 'divider', id: item.id }
				);
			} else if (item.group) {
				if (!emittedGroups.has(item.group)) {
					emittedGroups.add(item.group);
					const grouped = flat.filter((i) => i.group === item.group);
					out.push({ kind: 'group', id: `group-${item.group}`, items: grouped });
				}
			} else {
				out.push({ kind: 'item', id: item.id, item });
			}
		}
		return out;
	});

	function handleClick(item: PillDropdownItem, event: MouseEvent) {
		if (item.disabled || item.divider) return;
		item.onClick?.(event);
	}
</script>

<div class="dropdown-bar-wrapper" class:static={positioning === 'static'}>
	<div class="dropdown-bar-container">
		{#if label}
			<Pill disabled title={label}>
				{#snippet leading()}
					{#if iconSvg}
						<DynamicIcon {iconSvg} size="md" />
					{/if}
				{/snippet}
				{label}
			</Pill>
		{/if}

		{#each renderElements as el (el.id)}
			{#if el.kind === 'divider'}
				<div class="bar-divider"></div>
			{:else if el.kind === 'section-label'}
				<div class="bar-section-label">{el.label}</div>
			{:else if el.kind === 'group'}
				{@const showLabels = el.items.some((i) => (i.label?.length ?? 0) > 10)}
				<div class="segmented-toggle" class:with-labels={showLabels}>
					{#each el.items as gi (gi.id)}
						<button
							type="button"
							class="segmented-btn"
							class:active={gi.active}
							class:has-progress={gi.progress != null}
							disabled={gi.disabled}
							onclick={(e) => handleClick(gi, e)}
							title={gi.label}
						>
							{#if gi.progress != null}
								<svg class="progress-ring-inline" viewBox="0 0 20 20">
									<circle class="progress-bg" cx="10" cy="10" r="8" />
									<circle
										class="progress-fill"
										cx="10"
										cy="10"
										r="8"
										stroke-dasharray={8 * 2 * Math.PI}
										stroke-dashoffset={8 * 2 * Math.PI * (1 - gi.progress)}
									/>
								</svg>
							{:else if gi.iconSvg}
								<span class="segmented-icon"><DynamicIcon iconSvg={gi.iconSvg} size="md" /></span>
							{/if}
							{#if showLabels}
								<span class="segmented-label">{gi.label}</span>
							{/if}
						</button>
					{/each}
				</div>
			{:else}
				{@const item = el.item}
				<Pill
					active={item.active}
					primary={item.primary}
					danger={item.danger}
					disabled={item.disabled}
					onclick={(e) => handleClick(item, e)}
					title={item.label}
				>
					{#snippet leading()}
						{#if item.imageUrl}
							<img src={item.imageUrl} alt="" class="bar-img" />
						{:else if item.iconSvg}
							<DynamicIcon iconSvg={item.iconSvg} size="md" />
						{/if}
					{/snippet}
					{item.label}
				</Pill>
			{/if}
		{/each}
	</div>
</div>

<style>
	.dropdown-bar-wrapper {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: center;
		pointer-events: none;
		height: 64px;
	}

	.dropdown-bar-wrapper.static {
		position: relative;
	}

	.dropdown-bar-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		pointer-events: auto;
		width: fit-content;
		max-width: 100%;
		margin-left: auto;
		margin-right: auto;
		padding: 0 2rem;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 2rem,
			black calc(100% - 2rem),
			transparent 100%
		);
		-webkit-mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 2rem,
			black calc(100% - 2rem),
			transparent 100%
		);
	}

	.dropdown-bar-container::-webkit-scrollbar {
		display: none;
	}

	.bar-divider {
		width: 1px;
		height: 1.5rem;
		background: hsl(var(--color-border));
		flex-shrink: 0;
		margin: 0 0.125rem;
	}

	.bar-section-label {
		display: inline-flex;
		align-items: center;
		padding: 0 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: hsl(var(--color-muted-foreground));
		flex-shrink: 0;
		white-space: nowrap;
	}

	.bar-img {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		object-fit: cover;
	}

	.segmented-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		height: 44px;
		border-radius: 9999px;
		border: 1px solid hsl(var(--color-border));
		background: hsl(var(--color-surface));
		flex-shrink: 0;
	}

	.segmented-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 9999px;
		cursor: pointer;
		color: hsl(var(--color-foreground));
		transition: background-color 150ms;
		font-family: inherit;
	}

	.segmented-btn:hover:not(.active):not(:disabled) {
		background: hsl(var(--color-surface-hover));
	}

	.segmented-btn:focus-visible {
		outline: 2px solid hsl(var(--color-primary));
		outline-offset: 2px;
	}

	.segmented-btn.active {
		background: hsl(var(--color-primary) / 0.2);
		color: hsl(var(--color-primary));
	}

	.segmented-btn :global(.segmented-icon) {
		width: 1.25rem;
		height: 1.25rem;
	}

	.segmented-toggle.with-labels .segmented-btn {
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		width: auto;
	}

	.segmented-label {
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.progress-ring-inline {
		width: 20px;
		height: 20px;
		transform: rotate(-90deg);
		flex-shrink: 0;
	}

	.progress-bg {
		fill: none;
		stroke: hsl(var(--color-border));
		stroke-width: 2;
	}

	.progress-fill {
		fill: none;
		stroke: hsl(var(--color-primary));
		stroke-width: 2.5;
		stroke-linecap: round;
		transition: stroke-dashoffset 300ms ease;
	}

	.segmented-btn.has-progress {
		position: relative;
	}
</style>
