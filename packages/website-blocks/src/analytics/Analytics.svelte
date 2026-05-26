<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import type { AnalyticsProps } from './schema';

	let { block, mode }: BlockRenderProps<AnalyticsProps> = $props();

	const isPublic = $derived(mode === 'public');
	const configured = $derived(Boolean(block.props.siteKey));

	const plausibleSrc = $derived.by(() => {
		if (block.props.scriptUrl) return block.props.scriptUrl;
		return 'https://plausible.io/js/script.js';
	});
</script>

{#if !isPublic}
	<!-- Silent placeholder in edit/preview — the block is invisible and
	     exists only to emit a tracker snippet at publish time. -->
	<div class="wb-analytics-meta" data-mode={mode} aria-hidden="true">
		<span class="wb-analytics-meta__pill">
			📊 Analytics: {block.props.provider}
			{#if configured}({block.props.siteKey}){/if}
		</span>
	</div>
{:else if configured}
	{#if block.props.provider === 'plausible'}
		<script defer data-domain={block.props.siteKey} src={plausibleSrc}></script>
	{/if}
{/if}

<style>
	.wb-analytics-meta {
		display: flex;
		justify-content: center;
		padding: 0.5rem;
	}
	.wb-analytics-meta__pill {
		padding: 0.25rem 0.75rem;
		font-size: 0.7rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px dashed rgba(255, 255, 255, 0.2);
		border-radius: 9999px;
		opacity: 0.6;
		font-family: ui-monospace, monospace;
	}
</style>
