/**
 * World templates: pre-built area layouts for "New World" creation.
 * Each template generates one or more areas with pixel data.
 */

import { DEFAULT_MATERIALS } from '@manavoxel/shared';
import { encodeBytes, type LocalArea } from './local-store';

export interface WorldTemplate {
	id: string;
	name: string;
	description: string;
	icon: string;
	generate: () => {
		areas: { area: Omit<LocalArea, 'id' | 'createdAt' | 'updatedAt'>; id: string }[];
	};
}

function makePixels(
	w: number,
	h: number,
	floors: number,
	fill: (view: DataView, floor: number, x: number, y: number) => number
): Uint8Array {
	const data = new Uint8Array(w * h * floors * 2);
	const view = new DataView(data.buffer);
	for (let f = 0; f < floors; f++) {
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const mat = fill(view, f, x, y);
				if (mat !== 0) {
					const offset = f * w * h;
					view.setUint16((offset + y * w + x) * 2, mat, true);
				}
			}
		}
	}
	return data;
}

const paletteJson = JSON.stringify(DEFAULT_MATERIALS);

// ─── Village Template ───────────────────────────────────────

function generateVillage() {
	const streetId = crypto.randomUUID();
	const houseId = crypto.randomUUID();

	const streetW = 400,
		streetH = 250;
	const streetPixels = makePixels(streetW, streetH, 1, (_v, _f, x, y) => {
		if (x === 0 || x === streetW - 1 || y === 0 || y === streetH - 1) return 1;
		if (y >= 110 && y <= 140) return 12; // road
		if ((y > 140 || y < 110) && Math.random() < 0.2) return 3; // grass
		// House outlines
		if (x >= 30 && x <= 70 && y >= 30 && y <= 70) {
			if (x === 30 || x === 70 || y === 30 || y === 70) return 8;
			if (y === 70 && x >= 46 && x <= 54) return 0;
			return 0;
		}
		if (x >= 100 && x <= 150 && y >= 25 && y <= 75) {
			if (x === 100 || x === 150 || y === 25 || y === 75) return 4;
			if (y === 75 && x >= 120 && x <= 130) return 0;
			return 0;
		}
		// Well
		if (Math.abs(x - 200) <= 3 && Math.abs(y - 125) <= 3) {
			if (Math.abs(x - 200) === 3 || Math.abs(y - 125) === 3) return 12;
			return 7;
		}
		// Trees
		if (x === 300 && y >= 60 && y <= 75) return 4;
		if (Math.abs(x - 300) + Math.abs(y - 55) <= 6 && y < 62) return 13;
		// Torches
		if (y === 108 && x % 25 === 12) return 10;
		return 0;
	});

	const houseW = 200,
		houseH = 140;
	const housePixels = makePixels(houseW, houseH, 1, (_v, _f, x, y) => {
		if (x === 0 || x === houseW - 1 || y === 0 || y === houseH - 1) return 1;
		if (x > 2 && x < houseW - 3 && y > 2 && y < houseH - 3) return 5;
		if (y === houseH - 1 && x >= 45 && x <= 55) return 0;
		if (y === 0 && (x === 40 || x === 80 || x === 120 || x === 160)) return 9;
		return 0;
	});

	return {
		areas: [
			{
				id: streetId,
				area: {
					worldId: '',
					name: 'Dorfplatz',
					type: 'street' as const,
					resolution: 0.1,
					width: streetW,
					height: streetH,
					floors: 1,
					pixelData: encodeBytes(streetPixels),
					palette: paletteJson,
					entities: '[]',
					portals: JSON.stringify([
						{
							id: crypto.randomUUID(),
							x: 50,
							y: 70,
							floor: 0,
							targetAreaId: houseId,
							targetX: 50,
							targetY: 130,
							targetFloor: 0,
						},
					]),
					spawnX: 50,
					spawnY: 125,
					spawnFloor: 0,
				},
			},
			{
				id: houseId,
				area: {
					worldId: '',
					name: 'Bauernhaus',
					type: 'interior' as const,
					resolution: 0.05,
					width: houseW,
					height: houseH,
					floors: 1,
					pixelData: encodeBytes(housePixels),
					palette: paletteJson,
					entities: '[]',
					portals: JSON.stringify([
						{
							id: crypto.randomUUID(),
							x: 50,
							y: houseH - 1,
							floor: 0,
							targetAreaId: streetId,
							targetX: 50,
							targetY: 72,
							targetFloor: 0,
						},
					]),
					spawnX: 50,
					spawnY: houseH - 10,
					spawnFloor: 0,
				},
			},
		],
	};
}

// ─── Dungeon Template ───────────────────────────────────────

function generateDungeon() {
	const id = crypto.randomUUID();
	const w = 300,
		h = 300;
	const pixels = makePixels(w, h, 1, (_v, _f, x, y) => {
		// Outer stone walls
		if (x <= 2 || x >= w - 3 || y <= 2 || y >= h - 3) return 1;
		// Stone floor everywhere
		const mat = 12;
		// Corridors (cross shape)
		const inHCorridor = y >= 140 && y <= 160;
		const inVCorridor = x >= 140 && x <= 160;
		if (!inHCorridor && !inVCorridor) {
			// Rooms in corners
			if (x >= 20 && x <= 120 && y >= 20 && y <= 120) {
				if (x === 20 || x === 120 || y === 20 || y === 120) return 1;
				if (y === 120 && x >= 65 && x <= 75) return 0; // door
			}
			if (x >= 180 && x <= 280 && y >= 20 && y <= 120) {
				if (x === 180 || x === 280 || y === 20 || y === 120) return 1;
				if (y === 120 && x >= 225 && x <= 235) return 0;
			}
			if (x >= 20 && x <= 120 && y >= 180 && y <= 280) {
				if (x === 20 || x === 120 || y === 180 || y === 280) return 1;
				if (y === 180 && x >= 65 && x <= 75) return 0;
			}
			if (x >= 180 && x <= 280 && y >= 180 && y <= 280) {
				if (x === 180 || x === 280 || y === 180 || y === 280) return 1;
				if (y === 180 && x >= 225 && x <= 235) return 0;
			}
			// Walls between rooms and corridor
			if (
				!inHCorridor &&
				!inVCorridor &&
				!(x >= 20 && x <= 120 && y >= 20 && y <= 120) &&
				!(x >= 180 && x <= 280 && y >= 20 && y <= 120) &&
				!(x >= 20 && x <= 120 && y >= 180 && y <= 280) &&
				!(x >= 180 && x <= 280 && y >= 180 && y <= 280)
			) {
				return 1; // wall filler
			}
		}
		// Torches in corridors
		if (inHCorridor && y === 142 && x % 20 === 10) return 10;
		if (inVCorridor && x === 142 && y % 20 === 10) return 10;
		return mat;
	});

	return {
		areas: [
			{
				id,
				area: {
					worldId: '',
					name: 'Dungeon Eingang',
					type: 'interior' as const,
					resolution: 0.1,
					width: w,
					height: h,
					floors: 1,
					pixelData: encodeBytes(pixels),
					palette: paletteJson,
					entities: '[]',
					portals: '[]',
					spawnX: 150,
					spawnY: 150,
					spawnFloor: 0,
				},
			},
		],
	};
}

// ─── Arena Template ─────────────────────────────────────────

function generateArena() {
	const id = crypto.randomUUID();
	const w = 250,
		h = 250;
	const cx = 125,
		cy = 125,
		radius = 100;
	const pixels = makePixels(w, h, 1, (_v, _f, x, y) => {
		const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
		if (dist > radius + 3) return 0;
		if (dist > radius) return 1; // wall ring
		if (dist > radius - 2) return 6; // sand ring
		return 6; // sand floor
	});

	return {
		areas: [
			{
				id,
				area: {
					worldId: '',
					name: 'Arena',
					type: 'street' as const,
					resolution: 0.1,
					width: w,
					height: h,
					floors: 1,
					pixelData: encodeBytes(pixels),
					palette: paletteJson,
					entities: '[]',
					portals: '[]',
					spawnX: cx,
					spawnY: cy,
					spawnFloor: 0,
				},
			},
		],
	};
}

// ─── Empty Template ─────────────────────────────────────────

function generateEmpty() {
	const id = crypto.randomUUID();
	const w = 300,
		h = 200;
	const pixels = makePixels(w, h, 1, (_v, _f, x, y) => {
		if (x === 0 || x === w - 1 || y === 0 || y === h - 1) return 1;
		return 0;
	});

	return {
		areas: [
			{
				id,
				area: {
					worldId: '',
					name: 'Main',
					type: 'street' as const,
					resolution: 0.1,
					width: w,
					height: h,
					floors: 1,
					pixelData: encodeBytes(pixels),
					palette: paletteJson,
					entities: '[]',
					portals: '[]',
					spawnX: w / 2,
					spawnY: h / 2,
					spawnFloor: 0,
				},
			},
		],
	};
}

// ─── House Template ─────────────────────────────────────────

function generateHouse() {
	const id = crypto.randomUUID();
	const w = 200,
		h = 160;
	const pixels = makePixels(w, h, 2, (_v, f, x, y) => {
		if (x === 0 || x === w - 1 || y === 0 || y === h - 1) return 1;
		if (x > 2 && x < w - 3 && y > 2 && y < h - 3) return 5;
		if (f === 0 && y === h - 1 && x >= 45 && x <= 55) return 0; // door
		if (y === 0 && (x === 40 || x === 100 || x === 160)) return 9; // windows
		// Stairs
		if (x >= 170 && x <= 190 && y >= 120 && y <= 140) return 14;
		return 0;
	});

	return {
		areas: [
			{
				id,
				area: {
					worldId: '',
					name: 'Haus',
					type: 'interior' as const,
					resolution: 0.05,
					width: w,
					height: h,
					floors: 2,
					pixelData: encodeBytes(pixels),
					palette: paletteJson,
					entities: '[]',
					portals: '[]',
					spawnX: 50,
					spawnY: h - 10,
					spawnFloor: 0,
				},
			},
		],
	};
}

// ─── Export All Templates ───────────────────────────────────

export const WORLD_TEMPLATES: WorldTemplate[] = [
	{
		id: 'village',
		name: 'Village',
		description: 'A small village with street, houses, well, and trees',
		icon: '🏘️',
		generate: generateVillage,
	},
	{
		id: 'dungeon',
		name: 'Dungeon',
		description: 'A cross-shaped dungeon with four rooms and corridors',
		icon: '🏰',
		generate: generateDungeon,
	},
	{
		id: 'arena',
		name: 'Arena',
		description: 'A circular sand arena for PvP battles',
		icon: '⚔️',
		generate: generateArena,
	},
	{
		id: 'house',
		name: 'House',
		description: 'A two-story house to furnish and decorate',
		icon: '🏠',
		generate: generateHouse,
	},
	{
		id: 'empty',
		name: 'Empty',
		description: 'A blank canvas with stone borders — build anything',
		icon: '📄',
		generate: generateEmpty,
	},
];
