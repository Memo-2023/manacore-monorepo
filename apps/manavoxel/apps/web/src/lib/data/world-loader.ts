/**
 * Bridge between Dexie.js local-store and the PixiJS game engine.
 * Loads/saves world data from IndexedDB, converts between DB format and engine format.
 */

import {
	worldCollection,
	areaCollection,
	itemCollection,
	inventoryCollection,
	decodeBytes,
	encodeBytes,
	type LocalWorld,
	type LocalArea,
	type LocalItem,
} from './local-store';
import type {
	Area,
	PortalDef,
	EntityDef,
	Material,
	ItemProperties,
	TriggerAction,
	Rarity,
} from '@manavoxel/shared';
import { DEFAULT_MATERIALS } from '@manavoxel/shared';
import type { GameItem } from '$lib/engine/inventory.svelte';

/** Load a world and all its areas from IndexedDB */
export async function loadWorld(worldId: string): Promise<{
	world: LocalWorld;
	areas: Area[];
} | null> {
	const world = await worldCollection.get(worldId);
	if (!world) return null;

	const dbAreas = await areaCollection.getAll({ worldId });
	const areas = dbAreas.map(dbAreaToEngineArea);

	return { world, areas };
}

/** Get all worlds from IndexedDB */
export async function getAllWorlds(): Promise<LocalWorld[]> {
	return worldCollection.getAll();
}

/** Save an area's pixel data back to IndexedDB */
export async function saveAreaPixels(areaId: string, pixelData: Uint8Array) {
	await areaCollection.update(areaId, {
		pixelData: encodeBytes(pixelData),
		updatedAt: new Date().toISOString(),
	});
}

/** Save an area's entity definitions back to IndexedDB */
export async function saveAreaEntities(
	areaId: string,
	entities: import('@manavoxel/shared').EntityDef[]
) {
	await areaCollection.update(areaId, {
		entities: JSON.stringify(entities),
		updatedAt: new Date().toISOString(),
	});
}

/** Create a new world with areas in IndexedDB */
export async function createWorld(
	name: string,
	template: string,
	areas: { area: Omit<LocalArea, 'id' | 'createdAt' | 'updatedAt'>; id: string }[]
): Promise<string> {
	const worldId = crypto.randomUUID();
	const startAreaId = areas[0]?.id ?? '';

	await worldCollection.insert({
		id: worldId,
		name,
		description: '',
		creatorId: 'local',
		isPublished: false,
		playCount: 0,
		startAreaId,
		template,
		settings: {},
	});

	for (const { area, id } of areas) {
		await areaCollection.insert({
			...area,
			id,
			worldId,
		});
	}

	return worldId;
}

/** Delete a world and all its areas */
export async function deleteWorld(worldId: string) {
	const areas = await areaCollection.getAll({ worldId });
	for (const area of areas) {
		await areaCollection.delete(area.id);
	}
	await worldCollection.delete(worldId);
}

// ─── Item Persistence ──────────────────────────────────────

/** Save a GameItem to IndexedDB */
export async function saveItem(item: GameItem): Promise<void> {
	const existing = await itemCollection.get(item.id);
	const localItem: Partial<LocalItem> & { id: string } = {
		id: item.id,
		creatorId: 'local',
		name: item.name,
		description: '',
		spriteData: encodeBytes(item.sprite.pixels),
		spriteWidth: item.sprite.width,
		spriteHeight: item.sprite.height,
		animationFrames: item.sprite.frames || 1,
		resolution: 0.01,
		properties: JSON.stringify(item.properties),
		behavior: JSON.stringify(item.behaviors ?? []),
		rarity: item.rarity,
		isPublished: false,
	};

	if (existing) {
		await itemCollection.update(item.id, localItem);
	} else {
		await itemCollection.insert(localItem as LocalItem);
	}
}

/** Load all items from IndexedDB */
export async function loadAllItems(): Promise<GameItem[]> {
	const dbItems = await itemCollection.getAll();
	return dbItems.map(dbItemToGameItem);
}

/** Delete an item from IndexedDB */
export async function deleteItem(itemId: string): Promise<void> {
	await itemCollection.delete(itemId);
}

/** Save inventory state to IndexedDB */
export async function saveInventory(
	playerId: string,
	slots: (GameItem | null)[],
	heldSlot: number,
	gold = 0
): Promise<void> {
	// Clear existing inventory for this player
	const existing = await inventoryCollection.getAll({ playerId });
	for (const slot of existing) {
		await inventoryCollection.delete(slot.id);
	}

	// Save current slots
	for (let i = 0; i < slots.length; i++) {
		const item = slots[i];
		if (!item) continue;
		await inventoryCollection.insert({
			id: `${playerId}_slot_${i}`,
			playerId,
			itemId: item.id,
			slot: i,
			quantity: 1,
			instanceData: JSON.stringify({ heldSlot, gold }),
		});
	}

	// Save gold even if inventory is empty
	if (slots.every((s) => s === null)) {
		await inventoryCollection.insert({
			id: `${playerId}_meta`,
			playerId,
			itemId: '',
			slot: -1,
			quantity: 0,
			instanceData: JSON.stringify({ heldSlot, gold }),
		});
	}
}

/** Load inventory from IndexedDB */
export async function loadInventory(
	playerId: string
): Promise<{ slots: (string | null)[]; heldSlot: number; gold: number }> {
	const dbSlots = await inventoryCollection.getAll({ playerId });
	const slots: (string | null)[] = Array(8).fill(null);
	let heldSlot = -1;
	let gold = 0;

	for (const dbSlot of dbSlots) {
		if (dbSlot.slot >= 0 && dbSlot.slot < slots.length) {
			slots[dbSlot.slot] = dbSlot.itemId;
		}
		const data = safeJsonParse<{ heldSlot?: number; gold?: number }>(dbSlot.instanceData, {});
		if (data.heldSlot !== undefined) heldSlot = data.heldSlot;
		if (data.gold !== undefined) gold = data.gold;
	}

	return { slots, heldSlot, gold };
}

function dbItemToGameItem(dbItem: LocalItem): GameItem {
	return {
		id: dbItem.id,
		name: dbItem.name,
		sprite: {
			pixels: decodeBytes(dbItem.spriteData),
			width: dbItem.spriteWidth,
			height: dbItem.spriteHeight,
			frames: dbItem.animationFrames || 1,
		},
		properties: safeJsonParse<ItemProperties>(dbItem.properties, {
			damage: 0,
			range: 1,
			speed: 1,
			durabilityMax: 100,
			durabilityCurrent: 100,
			element: 'neutral',
			rarity: 'common',
			sound: 'hit_default',
			particle: 'none',
		}),
		rarity: dbItem.rarity as Rarity,
		behaviors: safeJsonParse<TriggerAction[]>(dbItem.behavior, []),
	};
}

// ─── Converters ─────────────────────────────────────────────

function dbAreaToEngineArea(dbArea: LocalArea): Area {
	return {
		id: dbArea.id,
		worldId: dbArea.worldId,
		name: dbArea.name,
		type: dbArea.type,
		resolution: dbArea.resolution,
		width: dbArea.width,
		height: dbArea.height,
		floors: dbArea.floors,
		pixelData: decodeBytes(dbArea.pixelData),
		palette: safeJsonParse<Material[]>(dbArea.palette, DEFAULT_MATERIALS),
		entities: safeJsonParse<EntityDef[]>(dbArea.entities, []),
		portals: safeJsonParse<PortalDef[]>(dbArea.portals, []),
		spawnPoint: { x: dbArea.spawnX, y: dbArea.spawnY, floor: dbArea.spawnFloor },
	};
}

function safeJsonParse<T>(json: string, fallback: T): T {
	try {
		return JSON.parse(json);
	} catch {
		return fallback;
	}
}
