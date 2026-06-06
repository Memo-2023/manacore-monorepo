import { Container } from 'pixi.js';
import { TilemapRenderer } from './tilemap';
import { Player } from './player';
import type { Area, PortalDef, Material } from '@manavoxel/shared';
import { DEFAULT_MATERIALS, MATERIAL_AIR } from '@manavoxel/shared';

export interface LoadedArea {
	data: Area;
	tilemap: TilemapRenderer;
	currentFloor: number;
}

/**
 * Manages area loading/unloading and portal transitions.
 * Each area is a separate tilemap with its own resolution.
 */
export class AreaManager {
	private _worldContainer: Container;
	private _currentArea: LoadedArea | null = null;
	private _areas = new Map<string, Area>();
	private _palette: Material[] = DEFAULT_MATERIALS;
	private _transitioning = false;
	private _transitionAlpha = 1;
	private _transitionCallback: (() => void) | null = null;

	/** Fires when a portal transition completes */
	onAreaChanged: ((area: LoadedArea) => void) | null = null;

	get currentArea() {
		return this._currentArea;
	}
	get isTransitioning() {
		return this._transitioning;
	}
	get transitionAlpha() {
		return this._transitionAlpha;
	}

	constructor(worldContainer: Container) {
		this._worldContainer = worldContainer;
	}

	/** Register an area so it can be loaded by ID */
	registerArea(area: Area) {
		this._areas.set(area.id, area);
	}

	/** Load and display an area */
	loadArea(areaId: string): LoadedArea | null {
		const area = this._areas.get(areaId);
		if (!area) return null;

		// Unload current
		if (this._currentArea) {
			this._worldContainer.removeChild(this._currentArea.tilemap['_container']);
		}

		// Create new tilemap with area's resolution
		const tilemap = new TilemapRenderer(this._worldContainer, this._palette, area.resolution);

		// Load pixel data into tilemap
		this._loadPixelData(tilemap, area);

		const loaded: LoadedArea = {
			data: area,
			tilemap,
			currentFloor: area.spawnPoint.floor,
		};

		this._currentArea = loaded;
		this.onAreaChanged?.(loaded);
		return loaded;
	}

	/** Start a portal transition (fade out → load → fade in) */
	enterPortal(portal: PortalDef, player: Player) {
		if (this._transitioning) return;

		this._transitioning = true;
		this._transitionAlpha = 1;

		// Fade out phase
		this._transitionCallback = () => {
			// Load target area
			const loaded = this.loadArea(portal.targetAreaId);
			if (loaded && player) {
				player.x = portal.targetX;
				player.y = portal.targetY;
			}
			// Fade in will happen in update()
		};
	}

	/** Check if player is standing on a portal */
	checkPortals(playerX: number, playerY: number, playerFloor: number): PortalDef | null {
		if (!this._currentArea) return null;

		const portals = this._currentArea.data.portals;
		for (const portal of portals) {
			if (portal.floor !== playerFloor) continue;

			// Portal occupies a 2x2 pixel area for easier detection
			const dx = Math.abs(Math.floor(playerX + 3) - portal.x); // +3 = player center
			const dy = Math.abs(Math.floor(playerY + 4) - portal.y); // +4 = player center
			if (dx <= 1 && dy <= 1) {
				return portal;
			}
		}
		return null;
	}

	/** Switch floor within the current interior */
	switchFloor(floor: number) {
		if (!this._currentArea) return;
		if (floor < 0 || floor >= this._currentArea.data.floors) return;
		this._currentArea.currentFloor = floor;

		// Reload pixel data for the new floor
		this._loadPixelData(this._currentArea.tilemap, this._currentArea.data, floor);
	}

	/** Called every frame to handle transition animation */
	update(dt: number) {
		if (!this._transitioning) return;

		if (this._transitionCallback) {
			// Fade out
			this._transitionAlpha -= dt * 0.05;
			if (this._transitionAlpha <= 0) {
				this._transitionAlpha = 0;
				this._transitionCallback();
				this._transitionCallback = null;
			}
		} else {
			// Fade in
			this._transitionAlpha += dt * 0.05;
			if (this._transitionAlpha >= 1) {
				this._transitionAlpha = 1;
				this._transitioning = false;
			}
		}
	}

	/** Load pixel data from an Area's compressed data into a tilemap */
	private _loadPixelData(tilemap: TilemapRenderer, area: Area, floor = 0) {
		// For now: treat pixelData as raw u16 array (no compression in MVP)
		// Each floor is width × height u16 values
		const floorSize = area.width * area.height;
		const offset = floor * floorSize * 2; // 2 bytes per pixel (u16)

		// Clear existing tilemap
		tilemap.clear();
		tilemap.setWorldSize(area.width, area.height);

		if (area.pixelData.length === 0) return;

		const view = new DataView(area.pixelData.buffer, area.pixelData.byteOffset + offset);

		for (let y = 0; y < area.height; y++) {
			for (let x = 0; x < area.width; x++) {
				const idx = (y * area.width + x) * 2;
				if (idx + 1 >= view.byteLength) break;
				const material = view.getUint16(idx, true); // little-endian
				if (material !== MATERIAL_AIR) {
					tilemap.setPixel(x, y, material);
				}
			}
		}
	}
}

// ─── Demo Data Generators ───────────────────────────────────

let areaIdCounter = 0;
function genId() {
	return `area_${++areaIdCounter}`;
}

/** Generate a demo street area */
export function generateDemoStreet(): Area {
	const id = genId();
	const width = 500; // 50m
	const height = 300; // 30m
	const pixelData = new Uint8Array(width * height * 2);
	const view = new DataView(pixelData.buffer);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let mat = MATERIAL_AIR;

			// Border walls
			if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
				mat = 1; // Stone
			}
			// Road (middle band)
			else if (y >= 130 && y <= 170) {
				mat = 12; // Cobblestone
			}
			// Grass areas
			else if (y > 170 || y < 130) {
				if (Math.random() < 0.3) mat = 3; // Grass patches
			}
			// Buildings (top side)
			else if (x >= 40 && x <= 80 && y >= 40 && y <= 80) {
				if (x === 40 || x === 80 || y === 40 || y === 80) mat = 8; // Brick walls
			}
			// Second building
			else if (x >= 120 && x <= 170 && y >= 30 && y <= 90) {
				if (x === 120 || x === 170 || y === 30 || y === 90)
					mat = 4; // Wood walls
				else if (y === 45 && (x === 135 || x === 155)) mat = 9; // Windows
			}
			// Trees
			else if (x === 250 && y >= 100 && y <= 120)
				mat = 4; // Trunk
			else if (Math.abs(x - 250) + Math.abs(y - 95) <= 8 && y < 105)
				mat = 13; // Leaves
			// Torches along the road
			else if (y === 128 && x % 40 === 20) mat = 10; // Torch

			if (mat !== MATERIAL_AIR) {
				view.setUint16((y * width + x) * 2, mat, true);
			}
		}
	}

	const interiorId = genId();

	return {
		id,
		worldId: 'demo',
		name: 'Marktplatz',
		type: 'street',
		resolution: 0.1,
		width,
		height,
		floors: 1,
		pixelData,
		palette: DEFAULT_MATERIALS,
		entities: [],
		portals: [
			{
				id: 'portal_1',
				x: 60,
				y: 80,
				floor: 0,
				targetAreaId: interiorId,
				targetX: 60,
				targetY: 110,
				targetFloor: 0,
			},
		],
		spawnPoint: { x: 60, y: 150, floor: 0 },
	};
}

/** Generate a demo interior area */
export function generateDemoInterior(id: string, streetId: string): Area {
	const width = 240; // 12m at 5cm = 240 pixels
	const height = 160; // 8m at 5cm = 160 pixels
	const floors = 2;
	const pixelData = new Uint8Array(width * height * floors * 2);
	const view = new DataView(pixelData.buffer);

	function setPixel(floor: number, x: number, y: number, mat: number) {
		const offset = floor * width * height;
		const idx = (offset + y * width + x) * 2;
		if (idx + 1 < pixelData.length) {
			view.setUint16(idx, mat, true);
		}
	}

	// Floor 0: Ground floor
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			// Walls
			if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
				setPixel(0, x, y, 1); // Stone walls
			}
			// Floor
			else if (y > 2 && x > 2 && x < width - 3 && y < height - 3) {
				setPixel(0, x, y, 5); // Plank floor
			}
			// Door back to street
			if (y === height - 1 && x >= 55 && x <= 65) {
				setPixel(0, x, y, MATERIAL_AIR);
			}
			// Windows
			if (y === 0 && (x === 40 || x === 80 || x === 120 || x === 160 || x === 200)) {
				setPixel(0, x, y, 9); // Glass
			}
		}
	}

	// Furniture on ground floor
	// Table (center of room)
	for (let y = 60; y <= 80; y++) {
		for (let x = 90; x <= 130; x++) {
			if (y === 60 || y === 80 || x === 90 || x === 130) {
				setPixel(0, x, y, 4); // Wood frame
			}
		}
	}

	// Fireplace (right wall)
	for (let y = 30; y <= 55; y++) {
		for (let x = 200; x <= 230; x++) {
			if (y === 30 || x === 200 || x === 230) {
				setPixel(0, x, y, 8); // Brick
			} else if (y >= 45 && y <= 50 && x >= 210 && x <= 220) {
				setPixel(0, x, y, 10); // Torch (fire)
			}
		}
	}

	// Stairs indicator (bottom-right)
	for (let y = 120; y <= 140; y++) {
		for (let x = 190; x <= 210; x++) {
			setPixel(0, x, y, 14); // Roof color = stairs marker
		}
	}

	// Floor 1: Upper floor
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
				setPixel(1, x, y, 1); // Walls
			} else if (y > 2 && x > 2 && x < width - 3 && y < height - 3) {
				setPixel(1, x, y, 5); // Plank floor
			}
		}
	}

	// Bed on upper floor
	for (let y = 30; y <= 70; y++) {
		for (let x = 20; x <= 60; x++) {
			if (y === 30 || y === 70 || x === 20 || x === 60) {
				setPixel(1, x, y, 4); // Wood frame
			} else {
				setPixel(1, x, y, 15); // Snow (white = sheets)
			}
		}
	}

	// Stairs back down on upper floor
	for (let y = 120; y <= 140; y++) {
		for (let x = 190; x <= 210; x++) {
			setPixel(1, x, y, 14); // Stairs marker
		}
	}

	return {
		id,
		worldId: 'demo',
		name: 'Haus am Marktplatz',
		type: 'interior',
		resolution: 0.05,
		width,
		height,
		floors,
		pixelData,
		palette: DEFAULT_MATERIALS,
		entities: [],
		portals: [
			{
				id: 'portal_back',
				x: 60,
				y: height - 1,
				floor: 0,
				targetAreaId: streetId,
				targetX: 60,
				targetY: 82,
				targetFloor: 0,
			},
		],
		spawnPoint: { x: 60, y: height - 10, floor: 0 },
	};
}
