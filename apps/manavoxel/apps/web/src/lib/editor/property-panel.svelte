<script lang="ts">
	import { untrack } from 'svelte';
	import type { GameItem } from '$lib/engine/inventory.svelte';
	import type { ElementType, Rarity } from '@manavoxel/shared';

	const {
		item,
		onUpdate = undefined as ((item: GameItem) => void) | undefined,
		onClose = undefined as (() => void) | undefined,
	} = $props<{ item: GameItem; onUpdate?: (item: GameItem) => void; onClose?: () => void }>();

	// Local reactive copies of properties (initialized once from the prop)
	let damage = $state(untrack(() => item.properties.damage));
	let range = $state(untrack(() => item.properties.range));
	let speed = $state(untrack(() => item.properties.speed));
	let durabilityMax = $state(untrack(() => item.properties.durabilityMax));
	let element = $state<ElementType>(untrack(() => item.properties.element));
	let rarity = $state<Rarity>(untrack(() => item.properties.rarity));
	let sound = $state(untrack(() => item.properties.sound));
	let particle = $state(untrack(() => item.properties.particle));
	let itemName = $state(untrack(() => item.name));

	const elements: { value: ElementType; label: string; color: string }[] = [
		{ value: 'neutral', label: 'Neutral', color: '#9CA3AF' },
		{ value: 'fire', label: 'Fire', color: '#EF4444' },
		{ value: 'ice', label: 'Ice', color: '#3B82F6' },
		{ value: 'poison', label: 'Poison', color: '#22C55E' },
		{ value: 'lightning', label: 'Lightning', color: '#EAB308' },
	];

	const rarities: { value: Rarity; label: string; color: string }[] = [
		{ value: 'common', label: 'Common', color: '#9CA3AF' },
		{ value: 'uncommon', label: 'Uncommon', color: '#22C55E' },
		{ value: 'rare', label: 'Rare', color: '#3B82F6' },
		{ value: 'epic', label: 'Epic', color: '#A855F7' },
		{ value: 'legendary', label: 'Legendary', color: '#EAB308' },
	];

	const sounds = [
		'hit_default',
		'hit_sword',
		'hit_blunt',
		'hit_magic',
		'whoosh',
		'explosion',
		'heal',
		'pickup',
		'drop',
		'break',
	];

	const particles = [
		'none',
		'sparks',
		'fire_burst',
		'ice_shards',
		'poison_cloud',
		'lightning_bolt',
		'heal_glow',
		'shatter',
	];

	function save() {
		item.name = itemName;
		item.rarity = rarity;
		item.properties = {
			...item.properties,
			damage,
			range,
			speed,
			durabilityMax,
			durabilityCurrent: durabilityMax,
			element,
			rarity,
			sound,
			particle,
		};
		onUpdate?.(item);
	}

	// Auto-save on any change
	$effect(() => {
		// Touch all reactive values to track them
		void [damage, range, speed, durabilityMax, element, rarity, sound, particle, itemName];
		save();
	});
</script>

<div class="flex w-64 flex-col gap-3 rounded-xl bg-gray-900 p-4 shadow-2xl">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium text-white">Item Properties</h3>
		{#if onClose}
			<button class="text-gray-500 hover:text-white" onclick={onClose}>X</button>
		{/if}
	</div>

	<!-- Name -->
	<div>
		<label class="mb-1 block text-xs text-gray-500">
			Name
			<input
				type="text"
				bind:value={itemName}
				class="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500"
			/>
		</label>
	</div>

	<!-- Damage -->
	<div>
		<label class="text-xs text-gray-500">
			<span class="mb-1 flex justify-between">
				<span>Damage</span>
				<span class="text-white">{damage}</span>
			</span>
			<input type="range" min="0" max="100" bind:value={damage} class="w-full accent-red-500" />
		</label>
	</div>

	<!-- Range -->
	<div>
		<label class="text-xs text-gray-500">
			<span class="mb-1 flex justify-between">
				<span>Range</span>
				<span class="text-white">{range}</span>
			</span>
			<input type="range" min="1" max="10" bind:value={range} class="w-full accent-blue-500" />
		</label>
	</div>

	<!-- Speed -->
	<div>
		<label class="text-xs text-gray-500">
			<span class="mb-1 flex justify-between">
				<span>Speed</span>
				<span class="text-white">{speed}</span>
			</span>
			<input
				type="range"
				min="1"
				max="10"
				step="0.5"
				bind:value={speed}
				class="w-full accent-yellow-500"
			/>
		</label>
	</div>

	<!-- Durability -->
	<div>
		<label class="text-xs text-gray-500">
			<span class="mb-1 flex justify-between">
				<span>Durability</span>
				<span class="text-white">{durabilityMax}</span>
			</span>
			<input
				type="range"
				min="1"
				max="200"
				bind:value={durabilityMax}
				class="w-full accent-green-500"
			/>
		</label>
	</div>

	<!-- Element -->
	<div>
		<span class="mb-1 block text-xs text-gray-500">Element</span>
		<div class="flex gap-1">
			{#each elements as el}
				<button
					class="rounded px-2 py-1 text-xs transition {element === el.value
						? 'ring-1 ring-white'
						: 'opacity-60 hover:opacity-100'}"
					style:background-color="{el.color}20"
					style:color={el.color}
					onclick={() => (element = el.value)}
				>
					{el.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Rarity -->
	<div>
		<span class="mb-1 block text-xs text-gray-500">Rarity</span>
		<div class="flex gap-1">
			{#each rarities as r}
				<button
					class="rounded px-1.5 py-0.5 text-[10px] transition {rarity === r.value
						? 'ring-1 ring-white'
						: 'opacity-50 hover:opacity-100'}"
					style:background-color="{r.color}20"
					style:color={r.color}
					onclick={() => (rarity = r.value)}
				>
					{r.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Sound -->
	<div>
		<label class="block text-xs text-gray-500">
			Sound
			<select
				bind:value={sound}
				class="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-xs text-white outline-none"
			>
				{#each sounds as s}
					<option value={s}>{s.replace('_', ' ')}</option>
				{/each}
			</select>
		</label>
	</div>

	<!-- Particle -->
	<div>
		<label class="block text-xs text-gray-500">
			Particle Effect
			<select
				bind:value={particle}
				class="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-xs text-white outline-none"
			>
				{#each particles as p}
					<option value={p}>{p === 'none' ? 'None' : p.replace('_', ' ')}</option>
				{/each}
			</select>
		</label>
	</div>

	<!-- Summary -->
	<div class="rounded bg-gray-800/50 p-2 text-[10px] text-gray-400">
		{itemName} | {element} | {damage} dmg | {rarity}
	</div>
</div>
