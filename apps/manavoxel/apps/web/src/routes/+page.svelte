<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { GameEngine } from '$lib/engine/game';
	import {
		DEFAULT_MATERIALS,
		MATERIAL_AIR,
		type ElementType,
		type Rarity,
	} from '@manavoxel/shared';
	import type { ToolType } from '$lib/editor/tools';
	import SpriteEditor from '$lib/editor/sprite-editor.svelte';
	import InventoryUI from '$lib/components/Inventory.svelte';
	import PropertyPanel from '$lib/editor/property-panel.svelte';
	import TriggerEditor from '$lib/editor/trigger-editor.svelte';
	import { Inventory, createItem, type GameItem } from '$lib/engine/inventory.svelte';
	import { gameStore } from '$lib/data/local-store';
	import {
		MERCHANT_OFFERS,
		rollLoot,
		rollGold,
		type DialogOption,
		type LootDrop,
	} from '$lib/engine/dialog';
	import {
		loadWorld,
		getAllWorlds,
		saveItem,
		loadAllItems,
		saveInventory,
		loadInventory,
		saveAreaPixels,
		saveAreaEntities,
	} from '$lib/data/world-loader';

	let canvasContainer: HTMLDivElement;
	let engine: GameEngine | null = $state(null);
	let loading = $state(true);
	let isEditing = $state(false);
	let selectedMaterial = $state(1);
	let activeTool = $state<ToolType>('brush');
	let brushSize = $state(1);
	let areaName = $state('');
	let currentFloor = $state(0);
	let totalFloors = $state(1);
	let showSpriteEditor = $state(false);
	let showPropertyPanel = $state(false);
	let showTriggerEditor = $state(false);
	let editingItem = $state<GameItem | null>(null);
	const inventory = $state(new Inventory());
	let itemCounter = $state(0);
	let timeString = $state('08:00');
	let isNight = $state(false);
	let dialogActive = $state(false);
	let showTradeUI = $state(false);
	let groundItems = $state<{ x: number; y: number; loot: LootDrop }[]>([]);
	let dialogLine = $state<{
		speaker: string;
		text: string;
		options?: { label: string; action: string; nextIndex?: number }[];
	} | null>(null);

	const tools: { id: ToolType; label: string; key: string }[] = [
		{ id: 'brush', label: 'Brush', key: 'B' },
		{ id: 'eraser', label: 'Eraser', key: 'E' },
		{ id: 'fill', label: 'Fill', key: 'G' },
		{ id: 'pipette', label: 'Pick', key: 'I' },
		{ id: 'npc', label: 'NPC', key: 'N' },
	];

	const npcTypes = [
		{ value: 'hostile', label: 'Hostile', color: '#EF4444' },
		{ value: 'passive', label: 'Passive', color: '#22C55E' },
		{ value: 'merchant', label: 'Merchant', color: '#EAB308' },
		{ value: 'guard', label: 'Guard', color: '#3B82F6' },
	];
	let selectedNpcType = $state('hostile');

	const materials = DEFAULT_MATERIALS.filter((m) => m.id !== MATERIAL_AIR);

	/** Generate a simple colored sprite for trade/loot items */
	function generateTradeSprite(): import('$lib/editor/types').SpriteData {
		const w = 16,
			h = 32;
		const pixels = new Uint8Array(w * h * 4);
		// Draw a simple diamond shape
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const cx = w / 2,
					cy = h / 2;
				const dist = Math.abs(x - cx) / cx + Math.abs(y - cy) / cy;
				if (dist < 0.8) {
					const i = (y * w + x) * 4;
					const hue = (x * 17 + y * 31) % 256;
					pixels[i] = 100 + (hue % 156);
					pixels[i + 1] = 80 + ((hue * 3) % 176);
					pixels[i + 2] = 120 + ((hue * 7) % 136);
					pixels[i + 3] = 255;
				}
			}
		}
		return { pixels, width: w, height: h, frames: 1 };
	}

	const PLAYER_ID = 'local-player';
	let autoSaveInterval: ReturnType<typeof setInterval>;
	let timeUpdateInterval: ReturnType<typeof setInterval>;
	let keydownHandler: ((ev: KeyboardEvent) => void) | null = null;

	async function initGame() {
		// Initialize local-first database (creates tables, seeds guest data)
		await gameStore.initialize();

		// Check for world ID in URL, otherwise load first world
		const params = new URLSearchParams(window.location.search);
		const requestedWorldId = params.get('world');

		let worldData = null;
		if (requestedWorldId) {
			worldData = await loadWorld(requestedWorldId);
		}
		if (!worldData) {
			const worlds = await getAllWorlds();
			if (worlds.length > 0) {
				worldData = await loadWorld(worlds[0].id);
			}
		}

		// Load saved items and restore inventory
		const savedItems = await loadAllItems();
		const savedInventory = await loadInventory(PLAYER_ID);
		const itemMap = new Map(savedItems.map((i) => [i.id, i]));

		for (let i = 0; i < savedInventory.slots.length; i++) {
			const itemId = savedInventory.slots[i];
			if (itemId) {
				const item = itemMap.get(itemId);
				if (item) inventory.slots[i] = item;
			}
		}
		if (savedInventory.heldSlot >= 0) {
			inventory.heldSlot = savedInventory.heldSlot;
		}
		inventory.gold = savedInventory.gold;
		itemCounter = savedItems.length;

		const e = new GameEngine(canvasContainer, worldData ?? undefined);
		e.inventory = inventory;
		e.registerItemBehaviors();
		engine = e;
		loading = false;

		// Gold + loot drops when NPCs die
		e.onNpcDeath = (npcX, npcY, behavior) => {
			const gold = rollGold(behavior);
			if (gold > 0) {
				inventory.gold += gold;
				e.showMessage(`+${gold} gold`);
			}
			const loot = rollLoot(behavior);
			if (loot) {
				groundItems = [...groundItems, { x: npcX, y: npcY, loot }];
			}
		};

		e.onStateChange = () => {
			isEditing = e.isEditing;
			selectedMaterial = e.selectedMaterial;
			activeTool = e.activeTool;
			brushSize = e.brushSize;
			areaName = e.areaName;
			currentFloor = e.currentFloor;
			totalFloors = e.totalFloors;
			timeString = e.dayNight.timeString;
			isNight = e.dayNight.isNight;
			dialogActive = e.dialog.active;
			dialogLine = e.dialog.currentLine;
		};

		// Update time display every second
		timeUpdateInterval = setInterval(() => {
			if (!e.dayNight) return;
			timeString = e.dayNight.timeString;
			isNight = e.dayNight.isNight;
		}, 1000);

		// Auto-save area data every 10 seconds
		autoSaveInterval = setInterval(async () => {
			const area = e.areaManager.currentArea;
			if (!area) return;
			const tilemap = area.tilemap;
			if (tilemap.isDirty) {
				tilemap.isDirty = false;
				const pixelData = tilemap.exportPixelData();
				await saveAreaPixels(area.data.id, pixelData);
			}
			// Always save entities (lightweight)
			await saveAreaEntities(area.data.id, area.data.entities);
		}, 10_000);

		// Keyboard shortcuts
		keydownHandler = (ev: KeyboardEvent) => {
			if (ev.target instanceof HTMLInputElement) return;
			switch (ev.key.toLowerCase()) {
				case 'tab':
					ev.preventDefault();
					e.toggleEditor();
					break;
				case 'b':
					e.setTool('brush');
					break;
				case 'e':
					e.setTool('eraser');
					break;
				case 'g':
					e.setTool('fill');
					break;
				case 'i':
					e.setTool('pipette');
					break;
				case 'n':
					e.setTool('npc');
					break;
				case '[':
					e.setBrushSize(e.brushSize - 2);
					break;
				case ']':
					e.setBrushSize(e.brushSize + 2);
					break;
			}
			// Number keys 1-9 select materials
			const num = parseInt(ev.key);
			if (num >= 1 && num <= 9 && num <= materials.length) {
				e.setMaterial(materials[num - 1].id);
			}
		};
		window.addEventListener('keydown', keydownHandler);
	}

	onMount(() => {
		initGame();

		return () => {
			clearInterval(autoSaveInterval);
			clearInterval(timeUpdateInterval);
			// Save on exit
			if (engine) {
				const area = engine.areaManager.currentArea;
				if (area && area.tilemap.isDirty) {
					const pixelData = area.tilemap.exportPixelData();
					saveAreaPixels(area.data.id, pixelData);
				}
				engine.destroy();
			}
			saveInventory(PLAYER_ID, inventory.slots, inventory.heldSlot, inventory.gold);
			if (keydownHandler) window.removeEventListener('keydown', keydownHandler);
		};
	});
</script>

<div class="relative h-screen w-screen overflow-hidden bg-gray-900">
	<!-- PixiJS Canvas -->
	<!-- Loading screen -->
	{#if loading}
		<div class="flex h-full w-full items-center justify-center">
			<div class="text-center">
				<div class="mb-3 text-2xl font-bold text-emerald-400">ManaVoxel</div>
				<div class="text-sm text-gray-500">Loading world...</div>
			</div>
		</div>
	{/if}

	<!-- PixiJS Canvas -->
	<div bind:this={canvasContainer} class="game-canvas h-full w-full" class:hidden={loading}></div>

	<!-- HUD Overlay -->
	<div class="pointer-events-none absolute inset-0">
		<!-- Top bar -->
		<div class="pointer-events-auto flex items-center justify-between p-3">
			<div class="flex items-center gap-3">
				<div
					class="rounded-lg bg-gray-800/80 px-3 py-1.5 text-sm font-medium text-white backdrop-blur"
				>
					ManaVoxel
				</div>
				{#if areaName}
					<div class="rounded-lg bg-gray-800/80 px-3 py-1.5 text-xs text-gray-300 backdrop-blur">
						{areaName}
						{#if totalFloors > 1}
							<span class="ml-1 text-gray-500">F{currentFloor + 1}/{totalFloors}</span>
						{/if}
					</div>
				{/if}
				{#if !isEditing && engine?.player}
					<div class="rounded-lg bg-gray-800/80 px-3 py-1.5 text-xs text-gray-300 backdrop-blur">
						HP: {engine.player.hp}/{engine.player.maxHp}
					</div>
					<div class="rounded-lg bg-gray-800/80 px-3 py-1.5 text-xs text-yellow-400 backdrop-blur">
						{inventory.gold}g
					</div>
					<div
						class="rounded-lg px-3 py-1.5 text-xs backdrop-blur {isNight
							? 'bg-indigo-900/80 text-indigo-300'
							: 'bg-gray-800/80 text-yellow-300'}"
					>
						{timeString}
					</div>
				{/if}
				{#if isEditing}
					<div class="rounded-lg bg-emerald-600/80 px-2 py-1 text-xs text-white backdrop-blur">
						EDITOR
					</div>
				{/if}
			</div>
			<div class="flex gap-2">
				<a
					href={resolve('/worlds')}
					class="rounded-lg bg-gray-800/80 px-3 py-1.5 text-sm text-gray-400 backdrop-blur hover:bg-gray-700/80 hover:text-white"
				>
					Worlds
				</a>
				{#if isEditing}
					<button
						class="rounded-lg bg-blue-600/80 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-blue-500/80"
						onclick={() => (showSpriteEditor = true)}
					>
						+ Item
					</button>
				{/if}
				<button
					class="rounded-lg px-3 py-1.5 text-sm text-white backdrop-blur transition {isEditing
						? 'bg-emerald-600/80 hover:bg-emerald-500/80'
						: 'bg-gray-800/80 hover:bg-gray-700/80'}"
					onclick={() => engine?.toggleEditor()}
				>
					{isEditing ? 'Play' : 'Edit'}
					<span class="ml-1 text-xs text-gray-400">Tab</span>
				</button>
			</div>
		</div>

		<!-- Editor Tools (left side) -->
		{#if isEditing}
			<div class="pointer-events-auto absolute left-3 top-16 flex flex-col gap-1">
				{#each tools as tool}
					<button
						class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white backdrop-blur transition {activeTool ===
						tool.id
							? 'bg-emerald-600/80'
							: 'bg-gray-800/80 hover:bg-gray-700/80'}"
						onclick={() => engine?.setTool(tool.id)}
					>
						{tool.label}
						<span class="text-gray-500">{tool.key}</span>
					</button>
				{/each}

				<!-- Brush size (only for paint tools) -->
				{#if activeTool !== 'npc'}
					<div class="mt-2 rounded-lg bg-gray-800/80 px-3 py-2 text-xs text-white backdrop-blur">
						<div class="mb-1 text-gray-400">Size: {brushSize}px</div>
						<div class="flex gap-1">
							{#each [1, 3, 5, 7] as size}
								<button
									class="rounded px-2 py-0.5 transition {brushSize === size
										? 'bg-emerald-600'
										: 'bg-gray-700 hover:bg-gray-600'}"
									onclick={() => engine?.setBrushSize(size)}
								>
									{size}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- NPC type selector (when NPC tool active) -->
				{#if activeTool === 'npc'}
					<div class="mt-2 rounded-lg bg-gray-800/80 px-3 py-2 text-xs text-white backdrop-blur">
						<div class="mb-1 text-gray-400">NPC Type</div>
						<div class="flex flex-col gap-1">
							{#each npcTypes as npc}
								<button
									class="flex items-center gap-2 rounded px-2 py-1 transition {selectedNpcType ===
									npc.value
										? 'bg-gray-600 ring-1 ring-white'
										: 'bg-gray-700 hover:bg-gray-600'}"
									onclick={() => {
										selectedNpcType = npc.value;
										engine?.setNpcBehavior(npc.value);
									}}
								>
									<span class="h-2 w-2 rounded-full" style:background-color={npc.color}></span>
									{npc.label}
								</button>
							{/each}
						</div>
						<div class="mt-2 text-[10px] text-gray-500">Click on map to place</div>
					</div>
				{/if}

				<!-- Undo/Redo -->
				<div class="mt-2 flex gap-1">
					<button
						class="rounded-lg bg-gray-800/80 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-gray-700/80 disabled:opacity-30"
						disabled={!engine?.undo.canUndo}
						onclick={() => engine?.undo.undo(engine.tilemap)}
					>
						Undo
					</button>
					<button
						class="rounded-lg bg-gray-800/80 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-gray-700/80 disabled:opacity-30"
						disabled={!engine?.undo.canRedo}
						onclick={() => engine?.undo.redo(engine.tilemap)}
					>
						Redo
					</button>
				</div>
			</div>
		{/if}

		<!-- Material Palette (bottom) -->
		{#if isEditing}
			<div class="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
				<div class="flex gap-1 rounded-lg bg-gray-800/90 p-2 backdrop-blur">
					{#each materials as mat, i}
						<button
							class="group relative h-8 w-8 rounded border-2 transition-transform hover:scale-110 {selectedMaterial ===
							mat.id
								? 'border-white scale-110'
								: 'border-transparent'}"
							style:background-color={mat.color}
							onclick={() => engine?.setMaterial(mat.id)}
							title="{mat.name} ({i + 1})"
						>
							{#if i < 9}
								<span
									class="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100"
								>
									{i + 1}
								</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Inventory bar (bottom center, always visible) -->
		{#if !showSpriteEditor}
			<div class="pointer-events-auto absolute bottom-14 left-1/2 -translate-x-1/2">
				<InventoryUI
					{inventory}
					onDrop={async (slot) => {
						inventory.removeItem(slot);
						await saveInventory(PLAYER_ID, inventory.slots, inventory.heldSlot, inventory.gold);
					}}
					onInspect={(item) => {
						editingItem = item;
						showPropertyPanel = true;
						showTriggerEditor = false;
					}}
				/>
			</div>
		{/if}

		<!-- Controls hint (bottom left) -->
		<div class="pointer-events-auto absolute bottom-4 left-4">
			<div class="rounded-lg bg-gray-800/60 px-3 py-1.5 text-[10px] text-gray-500 backdrop-blur">
				{#if isEditing}
					WASD: Pan | Scroll: Zoom | LClick: Place | RClick: Erase | 1-9: Material
				{:else}
					WASD: Move | E: Door | F: Stairs | Scroll: Zoom | Tab: Editor
				{/if}
			</div>
		</div>
	</div>

	<!-- Item Editor Panels (right sidebar) -->
	{#if editingItem && (showPropertyPanel || showTriggerEditor)}
		<div class="pointer-events-auto absolute right-4 top-16 z-40 flex flex-col gap-2">
			<!-- Tab buttons -->
			<div class="flex gap-1">
				<button
					class="rounded-lg px-3 py-1 text-xs transition {showPropertyPanel && !showTriggerEditor
						? 'bg-emerald-600 text-white'
						: 'bg-gray-800 text-gray-400 hover:bg-gray-700'}"
					onclick={() => {
						showPropertyPanel = true;
						showTriggerEditor = false;
					}}
				>
					Properties
				</button>
				<button
					class="rounded-lg px-3 py-1 text-xs transition {showTriggerEditor
						? 'bg-emerald-600 text-white'
						: 'bg-gray-800 text-gray-400 hover:bg-gray-700'}"
					onclick={() => {
						showTriggerEditor = true;
						showPropertyPanel = false;
					}}
				>
					Behaviors
				</button>
			</div>

			{#if showPropertyPanel}
				<PropertyPanel
					item={editingItem}
					onUpdate={async (updated) => {
						editingItem = updated;
						await saveItem(updated);
						engine?.registerItemBehaviors();
					}}
					onClose={() => {
						showPropertyPanel = false;
						editingItem = null;
					}}
				/>
			{/if}

			{#if showTriggerEditor && editingItem}
				<TriggerEditor
					behaviors={editingItem.behaviors ?? []}
					onUpdate={async (behaviors) => {
						if (!editingItem) return;
						editingItem.behaviors = behaviors;
						// Persist to IndexedDB
						await saveItem(editingItem);
						// Re-register behaviors in engine
						engine?.registerItemBehaviors();
					}}
					onClose={() => {
						showTriggerEditor = false;
						if (!showPropertyPanel) editingItem = null;
					}}
				/>
			{/if}
		</div>
	{/if}

	<!-- Sprite Editor Modal -->
	<!-- Dialog UI -->
	{#if dialogActive && dialogLine}
		<div class="absolute bottom-24 left-1/2 z-50 -translate-x-1/2">
			<div class="w-96 rounded-xl bg-gray-900/95 p-4 shadow-2xl backdrop-blur">
				<div class="mb-2 text-xs font-bold text-emerald-400">{dialogLine.speaker}</div>
				<div class="mb-3 text-sm text-gray-200">{dialogLine.text}</div>
				<div class="flex gap-2">
					{#each dialogLine.options ?? [{ label: 'Close', action: 'close' } as DialogOption] as option}
						<button
							class="rounded-lg bg-gray-700 px-4 py-1.5 text-xs text-white transition hover:bg-gray-600"
							onclick={() => {
								if (engine) {
									const result = engine.dialog.selectOption(option as DialogOption);
									dialogActive = engine.dialog.active;
									dialogLine = engine.dialog.currentLine;
									if (result === 'trade') {
										showTradeUI = true;
									}
								}
							}}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Trade UI -->
	{#if showTradeUI}
		<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
			<div class="w-[420px] rounded-xl bg-gray-900/95 p-5 shadow-2xl backdrop-blur">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-sm font-bold text-emerald-400">Merchant's Wares</h3>
					<button
						class="text-xs text-gray-500 hover:text-white"
						onclick={() => {
							showTradeUI = false;
							engine?.dialog.close();
							dialogActive = false;
						}}>Close</button
					>
				</div>
				<div class="flex max-h-80 flex-col gap-2 overflow-y-auto">
					{#each MERCHANT_OFFERS as offer}
						{@const rarityColor =
							offer.rarity === 'rare'
								? 'border-blue-500'
								: offer.rarity === 'uncommon'
									? 'border-green-500'
									: 'border-gray-600'}
						<div
							class="flex items-center justify-between rounded-lg border {rarityColor} bg-gray-800/80 p-3"
						>
							<div>
								<div class="text-sm font-medium text-white">{offer.name}</div>
								<div class="text-[10px] text-gray-400">{offer.description}</div>
								<div class="mt-1 flex gap-2 text-[10px] text-gray-500">
									{#if offer.damage > 0}<span>⚔ {offer.damage}</span>{/if}
									<span>↔ {offer.range}</span>
									<span>⚡ {offer.speed}</span>
									<span>🛡 {offer.durabilityMax}</span>
									{#if offer.element !== 'neutral'}<span class="capitalize text-yellow-400"
											>{offer.element}</span
										>{/if}
								</div>
							</div>
							<button
								class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-30"
								disabled={inventory.isFull || inventory.gold < offer.cost}
								onclick={async () => {
									if (inventory.gold < offer.cost) return;
									inventory.gold -= offer.cost;
									const item = createItem(offer.name, generateTradeSprite(), {
										damage: offer.damage,
										range: offer.range,
										speed: offer.speed,
										durabilityMax: offer.durabilityMax,
										durabilityCurrent: offer.durabilityMax,
										element: offer.element as ElementType,
										rarity: offer.rarity as Rarity,
										particle: offer.particle,
										sound: 'hit_default',
									});
									const slot = inventory.addItem(item);
									if (slot >= 0) {
										inventory.selectSlot(slot);
										await saveItem(item);
										await saveInventory(
											PLAYER_ID,
											inventory.slots,
											inventory.heldSlot,
											inventory.gold
										);
									}
								}}
							>
								{#if inventory.isFull}Full{:else if inventory.gold < offer.cost}Need {offer.cost}g{:else}Buy
									({offer.cost}g){/if}
							</button>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Loot pickup hint -->
	{#if groundItems.length > 0 && engine?.player}
		{@const nearby = groundItems.find((g) => {
			const dx = g.x - (engine?.player?.worldX ?? 0);
			const dy = g.y - (engine?.player?.worldY ?? 0);
			return Math.sqrt(dx * dx + dy * dy) < 80;
		})}
		{#if nearby}
			<div class="absolute bottom-36 left-1/2 z-30 -translate-x-1/2">
				<button
					class="rounded-lg bg-yellow-600/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur hover:bg-yellow-500"
					onclick={async () => {
						if (inventory.isFull) return;
						const item = createItem(nearby.loot.name, generateTradeSprite(), {
							damage: nearby.loot.damage,
							range: nearby.loot.range,
							speed: nearby.loot.speed,
							durabilityMax: nearby.loot.durabilityMax,
							durabilityCurrent: nearby.loot.durabilityMax,
							element: nearby.loot.element as ElementType,
							rarity: nearby.loot.rarity as Rarity,
							particle: nearby.loot.particle,
							sound: 'hit_default',
						});
						inventory.addItem(item);
						await saveItem(item);
						await saveInventory(PLAYER_ID, inventory.slots, inventory.heldSlot, inventory.gold);
						groundItems = groundItems.filter((g) => g !== nearby);
					}}
				>
					Pick up {nearby.loot.name} (E)
				</button>
			</div>
		{/if}
	{/if}

	{#if showSpriteEditor}
		<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
			<SpriteEditor
				width={16}
				height={32}
				onSave={async (data) => {
					itemCounter++;
					const item = createItem(`Item ${itemCounter}`, data);
					const slot = inventory.addItem(item);
					if (slot >= 0) {
						inventory.selectSlot(slot);
					}
					// Persist item and inventory to IndexedDB
					await saveItem(item);
					await saveInventory(PLAYER_ID, inventory.slots, inventory.heldSlot, inventory.gold);
					showSpriteEditor = false;
				}}
				onClose={() => (showSpriteEditor = false)}
			/>
		</div>
	{/if}
</div>
