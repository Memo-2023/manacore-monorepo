<script lang="ts">
	import { untrack } from 'svelte';
	import type { TriggerAction } from '@manavoxel/shared';

	const {
		behaviors = [] as TriggerAction[],
		onUpdate = undefined as ((behaviors: TriggerAction[]) => void) | undefined,
		onClose = undefined as (() => void) | undefined,
	} = $props();

	let rules = $state<TriggerAction[]>(untrack(() => structuredClone(behaviors)));

	const triggerTypes = [
		{ value: 'onTouch', label: 'Player touches' },
		{ value: 'onUse', label: 'Item used' },
		{ value: 'onPickup', label: 'Item picked up' },
		{ value: 'onDrop', label: 'Item dropped' },
		{ value: 'onTimer', label: 'Every X seconds' },
		{ value: 'onHpBelow', label: 'HP below X' },
		{ value: 'onAreaEnter', label: 'Entering area' },
		{ value: 'onCustomEvent', label: 'Custom event' },
		{ value: 'onDayNight', label: 'Day/Night change' },
	];

	const actionTypes = [
		{ value: 'damage', label: 'Deal damage', params: ['amount'] },
		{ value: 'heal', label: 'Heal', params: ['amount'] },
		{ value: 'particle', label: 'Spawn particles', params: ['type'] },
		{ value: 'sound', label: 'Play sound', params: ['name'] },
		{ value: 'setPixel', label: 'Place pixel', params: ['material', 'radius'] },
		{ value: 'deletePixel', label: 'Destroy pixels', params: ['radius'] },
		{ value: 'teleport', label: 'Teleport player', params: ['x', 'y'] },
		{ value: 'message', label: 'Show message', params: ['text'] },
		{ value: 'setVariable', label: 'Set variable', params: ['name', 'value'] },
		{ value: 'getVariable', label: 'Check variable', params: ['name'] },
		{ value: 'sendEvent', label: 'Send event', params: ['eventName'] },
		{ value: 'giveItem', label: 'Give item', params: ['itemId'] },
		{ value: 'light', label: 'Toggle light', params: ['color', 'radius'] },
		{ value: 'cameraShake', label: 'Camera shake', params: ['intensity'] },
		{ value: 'wait', label: 'Wait', params: ['seconds'] },
	];

	const particleTypes = [
		'sparks',
		'fire_burst',
		'ice_shards',
		'poison_cloud',
		'lightning_bolt',
		'heal_glow',
		'shatter',
	];
	const soundNames = [
		'hit_default',
		'hit_sword',
		'explosion',
		'heal',
		'whoosh',
		'pickup',
		'break',
		'magic',
	];

	function addRule() {
		rules = [
			...rules,
			{
				trigger: { type: 'onUse', params: {} },
				actions: [{ type: 'damage', params: { amount: 10 } }],
			},
		];
		save();
	}

	function removeRule(index: number) {
		rules = rules.filter((_, i) => i !== index);
		save();
	}

	function addAction(ruleIndex: number) {
		rules[ruleIndex].actions = [
			...rules[ruleIndex].actions,
			{ type: 'particle', params: { type: 'sparks' } },
		];
		save();
	}

	function removeAction(ruleIndex: number, actionIndex: number) {
		rules[ruleIndex].actions = rules[ruleIndex].actions.filter((_, i) => i !== actionIndex);
		save();
	}

	function save() {
		onUpdate?.(structuredClone(rules));
	}

	function getParamValue(params: Record<string, unknown>, key: string): string {
		return String(params[key] ?? '');
	}

	function setParam(params: Record<string, unknown>, key: string, value: string) {
		const num = Number(value);
		params[key] = isNaN(num) ? value : num;
		save();
	}
</script>

<div class="flex w-80 flex-col gap-3 rounded-xl bg-gray-900 p-4 shadow-2xl">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium text-white">Behaviors</h3>
		<div class="flex gap-2">
			<button
				class="rounded bg-emerald-600 px-2 py-0.5 text-xs text-white hover:bg-emerald-500"
				onclick={addRule}
			>
				+ Rule
			</button>
			{#if onClose}
				<button class="text-gray-500 hover:text-white" onclick={onClose}>X</button>
			{/if}
		</div>
	</div>

	{#if rules.length === 0}
		<div class="py-4 text-center text-xs text-gray-500">
			No behaviors yet. Click "+ Rule" to add one.
		</div>
	{/if}

	<div class="flex max-h-[400px] flex-col gap-3 overflow-y-auto">
		{#each rules as rule, ri}
			<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-2">
				<!-- Trigger -->
				<div class="mb-2 flex items-center gap-1">
					<span class="text-[10px] font-bold uppercase text-yellow-500">WHEN</span>
					<select
						bind:value={rule.trigger.type}
						onchange={save}
						class="flex-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white outline-none"
					>
						{#each triggerTypes as t}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
					<button class="text-xs text-red-400 hover:text-red-300" onclick={() => removeRule(ri)}>
						Del
					</button>
				</div>

				<!-- Trigger params -->
				{#if rule.trigger.type === 'onTimer'}
					<div class="mb-2 ml-4 flex items-center gap-1">
						<span class="text-[10px] text-gray-500">every</span>
						<input
							type="number"
							value={getParamValue(rule.trigger.params, 'seconds')}
							oninput={(e) => setParam(rule.trigger.params, 'seconds', e.currentTarget.value)}
							class="w-12 rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
							min="0.1"
							step="0.5"
						/>
						<span class="text-[10px] text-gray-500">sec</span>
					</div>
				{/if}
				{#if rule.trigger.type === 'onHpBelow'}
					<div class="mb-2 ml-4 flex items-center gap-1">
						<span class="text-[10px] text-gray-500">HP below</span>
						<input
							type="number"
							value={getParamValue(rule.trigger.params, 'threshold')}
							oninput={(e) => setParam(rule.trigger.params, 'threshold', e.currentTarget.value)}
							class="w-12 rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
						/>
					</div>
				{/if}

				<!-- Actions -->
				{#each rule.actions as action, ai}
					<div class="mb-1 ml-2 flex items-center gap-1">
						<span class="text-[10px] font-bold uppercase text-emerald-500">
							{ai === 0 ? 'THEN' : 'AND'}
						</span>
						<select
							bind:value={action.type}
							onchange={save}
							class="flex-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white outline-none"
						>
							{#each actionTypes as a}
								<option value={a.value}>{a.label}</option>
							{/each}
						</select>
						<button
							class="text-[10px] text-red-400 hover:text-red-300"
							onclick={() => removeAction(ri, ai)}
						>
							x
						</button>
					</div>

					<!-- Action params -->
					<div class="mb-1 ml-8 flex flex-wrap gap-1">
						{#if action.type === 'damage' || action.type === 'heal'}
							<input
								type="number"
								value={getParamValue(action.params, 'amount')}
								oninput={(e) => setParam(action.params, 'amount', e.currentTarget.value)}
								class="w-12 rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
								placeholder="amt"
							/>
						{/if}
						{#if action.type === 'particle'}
							<select
								value={getParamValue(action.params, 'type')}
								onchange={(e) => setParam(action.params, 'type', e.currentTarget.value)}
								class="rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
							>
								{#each particleTypes as p}
									<option value={p}>{p.replace('_', ' ')}</option>
								{/each}
							</select>
						{/if}
						{#if action.type === 'sound'}
							<select
								value={getParamValue(action.params, 'name')}
								onchange={(e) => setParam(action.params, 'name', e.currentTarget.value)}
								class="rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
							>
								{#each soundNames as s}
									<option value={s}>{s.replace('_', ' ')}</option>
								{/each}
							</select>
						{/if}
						{#if action.type === 'deletePixel' || action.type === 'setPixel'}
							<input
								type="number"
								value={getParamValue(action.params, 'radius')}
								oninput={(e) => setParam(action.params, 'radius', e.currentTarget.value)}
								class="w-12 rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
								placeholder="radius"
								min="1"
								max="10"
							/>
						{/if}
						{#if action.type === 'message'}
							<input
								type="text"
								value={getParamValue(action.params, 'text')}
								oninput={(e) => setParam(action.params, 'text', e.currentTarget.value)}
								class="w-full rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
								placeholder="Message text..."
							/>
						{/if}
						{#if action.type === 'wait'}
							<input
								type="number"
								value={getParamValue(action.params, 'seconds')}
								oninput={(e) => setParam(action.params, 'seconds', e.currentTarget.value)}
								class="w-12 rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
								placeholder="sec"
								min="0.1"
								step="0.1"
							/>
						{/if}
						{#if action.type === 'cameraShake'}
							<input
								type="number"
								value={getParamValue(action.params, 'intensity')}
								oninput={(e) => setParam(action.params, 'intensity', e.currentTarget.value)}
								class="w-12 rounded bg-gray-700 px-1 py-0.5 text-xs text-white outline-none"
								placeholder="1-10"
								min="1"
								max="10"
							/>
						{/if}
					</div>
				{/each}

				<button
					class="ml-2 mt-1 text-[10px] text-gray-500 hover:text-emerald-400"
					onclick={() => addAction(ri)}
				>
					+ Add action
				</button>
			</div>
		{/each}
	</div>

	<!-- Preview as readable text -->
	{#if rules.length > 0}
		<div class="rounded bg-gray-800/50 p-2">
			<div class="mb-1 text-[10px] text-gray-500">Preview:</div>
			{#each rules as rule}
				<div class="text-[10px] text-gray-400">
					<span class="text-yellow-500">WHEN</span>
					{triggerTypes.find((t) => t.value === rule.trigger.type)?.label ?? rule.trigger.type}
					{#each rule.actions as action, i}
						<span class="text-emerald-500">{i === 0 ? ' THEN ' : ' AND '}</span>
						{actionTypes.find((a) => a.value === action.type)?.label ?? action.type}
						{#if action.params.amount}({action.params.amount}){/if}
						{#if action.params.type}({action.params.type}){/if}
						{#if action.params.text}("{action.params.text}"){/if}
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
