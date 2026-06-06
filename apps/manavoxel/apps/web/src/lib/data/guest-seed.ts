/**
 * Guest seed data: A small demo village that appears on first visit.
 * Generates worlds, areas, and starter items for the guest experience.
 */

import { DEFAULT_MATERIALS } from '@manavoxel/shared';
import { encodeBytes, type LocalWorld, type LocalArea, type LocalItem } from './local-store';

// Cached result so guest seed is only generated once
let cached: { worlds: LocalWorld[]; areas: LocalArea[]; items: LocalItem[] } | null = null;

export function generateGuestWorld() {
	if (cached) return cached;

	const worldId = 'guest-world-002';
	const streetId = 'guest-street-002';
	const houseId = 'guest-house-002';

	// ─── Street (50m × 30m at 10cm) ─────────────────────────

	const streetW = 500;
	const streetH = 300;
	const streetPixels = new Uint8Array(streetW * streetH * 2);
	const streetView = new DataView(streetPixels.buffer);

	for (let y = 0; y < streetH; y++) {
		for (let x = 0; x < streetW; x++) {
			// Start with grass everywhere (top-down: everything needs a ground)
			let mat = 3; // Grass

			// Stone border wall around the whole area
			if (x <= 1 || x >= streetW - 2 || y <= 1 || y >= streetH - 2) {
				mat = 1; // Stone wall
			}
			// Cobblestone road (horizontal, center)
			else if (y >= 120 && y <= 180) {
				mat = 12; // Cobblestone
				// Road edge markings
				if (y === 120 || y === 180) mat = 1;
			}
			// Dirt path (vertical, connecting to road)
			else if (x >= 148 && x <= 152 && y < 120) {
				mat = 2; // Dirt
			}
			// Sand area (bottom right, like a beach/playground)
			else if (x >= 350 && y >= 200 && x <= 450 && y <= 270) {
				mat = 6; // Sand
			}

			// ── Buildings (on top of ground) ──

			// House 1: Brick house (top-left area)
			if (x >= 40 && x <= 90 && y >= 40 && y <= 90) {
				if (x === 40 || x === 90 || y === 40 || y === 90) {
					mat = 8; // Brick walls
				} else {
					mat = 5; // Plank floor inside
				}
				// Door (south wall)
				if (y === 90 && x >= 60 && x <= 70) mat = 2; // Dirt (open door)
				// Windows
				if (y === 40 && (x === 55 || x === 75)) mat = 9;
			}

			// House 2: Wood cabin (top-center)
			if (x >= 130 && x <= 190 && y >= 35 && y <= 95) {
				if (x === 130 || x === 190 || y === 35 || y === 95) {
					mat = 4; // Wood walls
				} else {
					mat = 5; // Plank floor
				}
				if (y === 95 && x >= 155 && x <= 165) mat = 2; // Door
				if (y === 35 && (x === 145 || x === 160 || x === 175)) mat = 9; // Windows
			}

			// House 3: Stone tower (top-right)
			if (x >= 260 && x <= 300 && y >= 50 && y <= 110) {
				if (x === 260 || x === 300 || y === 50 || y === 110) {
					mat = 1; // Stone walls
				} else {
					mat = 12; // Stone floor
				}
				if (y === 110 && x >= 275 && x <= 285) mat = 2; // Door
			}

			// Well (center of village, on the road)
			if (Math.abs(x - 250) <= 5 && Math.abs(y - 150) <= 5) {
				if (Math.abs(x - 250) === 5 || Math.abs(y - 150) === 5) {
					mat = 1; // Stone rim
				} else {
					mat = 7; // Water
				}
			}

			// Market stalls (south of road)
			if (x >= 60 && x <= 80 && y >= 200 && y <= 215) {
				if (y === 200)
					mat = 4; // Wood counter
				else if (y === 215 && (x === 60 || x === 80)) mat = 4; // Posts
			}
			if (x >= 120 && x <= 140 && y >= 200 && y <= 215) {
				if (y === 200) mat = 4;
				else if (y === 215 && (x === 120 || x === 140)) mat = 4;
			}

			// ── Nature ──

			// Trees (scattered, on grass areas only)
			const trees = [
				[30, 150],
				[320, 80],
				[380, 60],
				[420, 140],
				[350, 220],
				[100, 250],
				[200, 230],
				[450, 90],
				[20, 250],
				[480, 200],
			];
			for (const [tx, ty] of trees) {
				// Trunk
				if (x === tx && y >= ty && y <= ty + 8) mat = 4;
				// Leaves (diamond shape)
				if (Math.abs(x - tx) + Math.abs(y - (ty - 3)) <= 6 && y < ty + 1 && y > ty - 8) {
					mat = 13;
				}
			}

			// Flower patches
			if (mat === 3 && (x + y * 7) % 47 === 0) {
				mat = 10; // Yellow flowers (torch color = yellow)
			}

			// Torches along the road
			if (y === 119 && x % 25 === 12 && x > 5 && x < streetW - 5) mat = 10;
			if (y === 181 && x % 25 === 12 && x > 5 && x < streetW - 5) mat = 10;

			streetView.setUint16((y * streetW + x) * 2, mat, true);
		}
	}

	// ─── House Interior (12m × 8m at 5cm = 240 × 160, 2 floors) ─

	const houseW = 240;
	const houseH = 160;
	const houseFloors = 2;
	const housePixels = new Uint8Array(houseW * houseH * houseFloors * 2);
	const houseView = new DataView(housePixels.buffer);

	function setHousePixel(floor: number, x: number, y: number, mat: number) {
		const offset = floor * houseW * houseH;
		const idx = (offset + y * houseW + x) * 2;
		if (idx + 1 < housePixels.length) houseView.setUint16(idx, mat, true);
	}

	// Ground floor
	for (let y = 0; y < houseH; y++) {
		for (let x = 0; x < houseW; x++) {
			if (x === 0 || x === houseW - 1 || y === 0 || y === houseH - 1) setHousePixel(0, x, y, 1);
			else if (x > 2 && x < houseW - 3 && y > 2 && y < houseH - 3) setHousePixel(0, x, y, 5);
			if (y === houseH - 1 && x >= 55 && x <= 65) setHousePixel(0, x, y, 0); // door
			if (y === 0 && (x === 40 || x === 80 || x === 120 || x === 160 || x === 200))
				setHousePixel(0, x, y, 9);
		}
	}
	// Table
	for (let y = 50; y <= 75; y++)
		for (let x = 80; x <= 130; x++)
			if (y === 50 || y === 75 || x === 80 || x === 130) setHousePixel(0, x, y, 4);
	// Fireplace
	for (let y = 20; y <= 50; y++)
		for (let x = 190; x <= 225; x++) {
			if (y === 20 || x === 190 || x === 225) setHousePixel(0, x, y, 8);
			else if (y >= 38 && y <= 45 && x >= 200 && x <= 215) setHousePixel(0, x, y, 10);
		}
	// Stairs
	for (let y = 120; y <= 140; y++) for (let x = 190; x <= 210; x++) setHousePixel(0, x, y, 14);

	// Upper floor
	for (let y = 0; y < houseH; y++) {
		for (let x = 0; x < houseW; x++) {
			if (x === 0 || x === houseW - 1 || y === 0 || y === houseH - 1) setHousePixel(1, x, y, 1);
			else if (x > 2 && x < houseW - 3 && y > 2 && y < houseH - 3) setHousePixel(1, x, y, 5);
		}
	}
	// Bed
	for (let y = 25; y <= 65; y++)
		for (let x = 20; x <= 60; x++) {
			if (y === 25 || y === 65 || x === 20 || x === 60) setHousePixel(1, x, y, 4);
			else setHousePixel(1, x, y, 15);
		}
	// Stairs back
	for (let y = 120; y <= 140; y++) for (let x = 190; x <= 210; x++) setHousePixel(1, x, y, 14);

	// ─── Assemble Data ──────────────────────────────────────

	const worlds: LocalWorld[] = [
		{
			id: worldId,
			name: 'Demo Village',
			description: 'A small village to explore and build in',
			creatorId: 'guest',
			isPublished: false,
			playCount: 0,
			startAreaId: streetId,
			template: 'village',
			settings: {},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	];

	const paletteJson = JSON.stringify(DEFAULT_MATERIALS);

	const areas: LocalArea[] = [
		{
			id: streetId,
			worldId,
			name: 'Marktplatz',
			type: 'street',
			resolution: 0.1,
			width: streetW,
			height: streetH,
			floors: 1,
			pixelData: encodeBytes(streetPixels),
			palette: paletteJson,
			entities: '[]',
			portals: JSON.stringify([
				{
					id: 'portal-to-house',
					x: 60,
					y: 80,
					floor: 0,
					targetAreaId: houseId,
					targetX: 60,
					targetY: 150,
					targetFloor: 0,
				},
			]),
			spawnX: 200,
			spawnY: 150,
			spawnFloor: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		{
			id: houseId,
			worldId,
			name: 'Haus am Marktplatz',
			type: 'interior',
			resolution: 0.05,
			width: houseW,
			height: houseH,
			floors: houseFloors,
			pixelData: encodeBytes(housePixels),
			palette: paletteJson,
			entities: '[]',
			portals: JSON.stringify([
				{
					id: 'portal-to-street',
					x: 60,
					y: houseH - 1,
					floor: 0,
					targetAreaId: streetId,
					targetX: 60,
					targetY: 82,
					targetFloor: 0,
				},
			]),
			spawnX: 60,
			spawnY: houseH - 10,
			spawnFloor: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	];

	const items: LocalItem[] = [];

	cached = { worlds, areas, items };
	return cached;
}
