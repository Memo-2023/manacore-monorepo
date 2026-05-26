<script lang="ts">
	import type { BlockInspectorProps } from '../types';
	import type { AnalyticsProps } from './schema';

	let { block, onChange }: BlockInspectorProps<AnalyticsProps> = $props();

	const provider = $derived(block.props.provider);

	const helpText = $derived.by(() => {
		if (provider === 'plausible') {
			return 'Trage hier die Domain ein, die du bei Plausible registriert hast (z.B. "meineseite.de"). Keine Cookies, DSGVO-konform.';
		}
		return 'Keine Cookies, DSGVO-konform.';
	});

	const keyLabel = $derived(provider === 'plausible' ? 'Domain' : 'Website-ID');
	const keyPlaceholder = $derived(provider === 'plausible' ? 'meineseite.de' : 'abc12345-1234-…');
</script>

<div class="wb-inspector">
	<label class="wb-field">
		<span>Provider</span>
		<select
			value={block.props.provider}
			onchange={(e) => onChange({ provider: e.currentTarget.value as AnalyticsProps['provider'] })}
		>
			<option value="plausible">Plausible</option>
		</select>
	</label>

	<label class="wb-field">
		<span>{keyLabel}</span>
		<input
			type="text"
			value={block.props.siteKey}
			oninput={(e) => onChange({ siteKey: e.currentTarget.value.trim() })}
			placeholder={keyPlaceholder}
		/>
		<small>{helpText}</small>
	</label>

	<label class="wb-field">
		<span>Script-URL (optional)</span>
		<input
			type="url"
			value={block.props.scriptUrl}
			oninput={(e) => onChange({ scriptUrl: e.currentTarget.value.trim() })}
			placeholder="https://analytics.deineseite.de/script.js"
		/>
		<small>Für selbst-gehostete Instanzen. Leer lassen für Default-CDN.</small>
	</label>

	<p class="wb-hint">
		Der Block ist im Editor unsichtbar — er fügt auf der veröffentlichten Website einen einzigen
		&lt;script&gt;-Tag ein. Keine Cookies, keine PII.
	</p>
</div>

<style>
	.wb-inspector {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.wb-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.wb-field > span {
		font-size: 0.75rem;
		font-weight: 500;
		opacity: 0.7;
	}
	.wb-field input,
	.wb-field select {
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: inherit;
		font-size: 0.875rem;
	}
	.wb-field small {
		font-size: 0.7rem;
		opacity: 0.55;
		line-height: 1.4;
	}
	.wb-hint {
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0.375rem;
		font-size: 0.75rem;
		opacity: 0.6;
		line-height: 1.4;
	}
</style>
