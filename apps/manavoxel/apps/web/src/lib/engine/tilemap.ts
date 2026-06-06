import { Container, Graphics } from 'pixi.js';
import { CHUNK_SIZE, MATERIAL_AIR, type Material } from '@manavoxel/shared';

/**
 * Chunk-based tilemap renderer.
 * Each chunk is a 32×32 grid of pixels rendered as a single Graphics object.
 * Only chunks in view are rendered. Chunks are re-drawn only when dirty.
 */

interface Chunk {
	cx: number;
	cy: number;
	pixels: Uint16Array; // CHUNK_SIZE * CHUNK_SIZE
	graphics: Graphics;
	dirty: boolean;
}

export class TilemapRenderer {
	readonly tileSize: number; // Screen pixels per world pixel (at 1x zoom)
	/** True when pixel data has been modified since last save */
	isDirty = false;
	private _container: Container;
	private _palette: Material[];
	private _chunks = new Map<string, Chunk>();
	private _worldWidth = 0;
	private _worldHeight = 0;

	get worldWidth() {
		return this._worldWidth;
	}
	get worldHeight() {
		return this._worldHeight;
	}
	get container() {
		return this._container;
	}

	/**
	 * @param resolution - meters per pixel (0.1 for streets, 0.05 for interiors)
	 */
	constructor(worldContainer: Container, palette: Material[], resolution = 0.1) {
		this.tileSize = Math.round(8 * (0.1 / resolution));
		this._container = new Container();
		worldContainer.addChild(this._container);
		this._palette = palette;
	}

	/** Set world bounds (used when loading an area) */
	setWorldSize(width: number, height: number) {
		this._worldWidth = width;
		this._worldHeight = height;
	}

	/** Remove all chunks and clear the renderer */
	clear() {
		for (const chunk of this._chunks.values()) {
			this._container.removeChild(chunk.graphics);
			chunk.graphics.destroy();
		}
		this._chunks.clear();
		this._worldWidth = 0;
		this._worldHeight = 0;
	}

	/** Generate a flat world with grass floor and stone borders */
	generateFlatWorld(width: number, height: number) {
		this._worldWidth = width;
		this._worldHeight = height;

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let material = MATERIAL_AIR;

				// Border walls
				if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
					material = 1; // Stone
				}
				// Grass floor (bottom third)
				else if (y > height * 0.7) {
					material = 3; // Grass
				}
				// Dirt under grass
				else if (y > height * 0.75) {
					material = 2; // Dirt
				}
				// Stone deep underground
				else if (y > height * 0.85) {
					material = 1; // Stone
				}
				// A few demo buildings
				else if (x >= 50 && x <= 70 && y >= 150 && y <= 180) {
					// Small stone house
					if (x === 50 || x === 70 || y === 150 || y === 180) {
						material = 8; // Brick
					} else if (y === 155 && (x === 55 || x === 65)) {
						material = 9; // Glass windows
					}
				}
				// A wooden platform
				else if (x >= 100 && x <= 130 && y === 170) {
					material = 5; // Plank
				}
				// Some trees (simple: trunk + leaves)
				else if (x === 200 && y >= 160 && y <= 170) {
					material = 4; // Wood trunk
				} else if (
					x >= 196 &&
					x <= 204 &&
					y >= 155 &&
					y <= 162 &&
					Math.abs(x - 200) + Math.abs(y - 158) <= 5
				) {
					material = 13; // Leaves
				}

				if (material !== MATERIAL_AIR) {
					this._setPixelRaw(x, y, material);
				}
			}
		}

		// Mark all chunks dirty for initial render
		for (const chunk of this._chunks.values()) {
			chunk.dirty = true;
		}
		this._renderDirtyChunks();
	}

	/** Set a pixel and mark chunk dirty */
	setPixel(x: number, y: number, material: number) {
		if (x < 0 || x >= this._worldWidth || y < 0 || y >= this._worldHeight) return;
		this._setPixelRaw(x, y, material);
		this.isDirty = true;

		const key = this._chunkKey(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
		const chunk = this._chunks.get(key);
		if (chunk) {
			chunk.dirty = true;
			this._renderChunk(chunk);
		}
	}

	/** Get pixel material at world position */
	getPixel(x: number, y: number): number {
		const cx = Math.floor(x / CHUNK_SIZE);
		const cy = Math.floor(y / CHUNK_SIZE);
		const chunk = this._chunks.get(this._chunkKey(cx, cy));
		if (!chunk) return MATERIAL_AIR;

		const lx = x - cx * CHUNK_SIZE;
		const ly = y - cy * CHUNK_SIZE;
		return chunk.pixels[ly * CHUNK_SIZE + lx];
	}

	/** Export pixel data as Uint8Array (Uint16 little-endian per pixel) */
	exportPixelData(): Uint8Array {
		const data = new Uint8Array(this._worldWidth * this._worldHeight * 2);
		const view = new DataView(data.buffer);
		for (let y = 0; y < this._worldHeight; y++) {
			for (let x = 0; x < this._worldWidth; x++) {
				const mat = this.getPixel(x, y);
				if (mat !== MATERIAL_AIR) {
					view.setUint16((y * this._worldWidth + x) * 2, mat, true);
				}
			}
		}
		return data;
	}

	/** Check if a world pixel is solid (for collision) */
	isSolid(x: number, y: number): boolean {
		const mat = this.getPixel(x, y);
		return this._palette[mat]?.solid ?? false;
	}

	private _setPixelRaw(x: number, y: number, material: number) {
		const cx = Math.floor(x / CHUNK_SIZE);
		const cy = Math.floor(y / CHUNK_SIZE);
		const key = this._chunkKey(cx, cy);

		let chunk = this._chunks.get(key);
		if (!chunk) {
			chunk = this._createChunk(cx, cy);
			this._chunks.set(key, chunk);
		}

		const lx = x - cx * CHUNK_SIZE;
		const ly = y - cy * CHUNK_SIZE;
		chunk.pixels[ly * CHUNK_SIZE + lx] = material;
		chunk.dirty = true;
	}

	private _createChunk(cx: number, cy: number): Chunk {
		const graphics = new Graphics();
		graphics.x = cx * CHUNK_SIZE * this.tileSize;
		graphics.y = cy * CHUNK_SIZE * this.tileSize;
		this._container.addChild(graphics);

		return {
			cx,
			cy,
			pixels: new Uint16Array(CHUNK_SIZE * CHUNK_SIZE),
			graphics,
			dirty: true,
		};
	}

	private _renderDirtyChunks() {
		for (const chunk of this._chunks.values()) {
			if (chunk.dirty) {
				this._renderChunk(chunk);
			}
		}
	}

	private _renderChunk(chunk: Chunk) {
		const g = chunk.graphics;
		g.clear();

		const ts = this.tileSize;

		for (let ly = 0; ly < CHUNK_SIZE; ly++) {
			for (let lx = 0; lx < CHUNK_SIZE; lx++) {
				const mat = chunk.pixels[ly * CHUNK_SIZE + lx];
				if (mat === MATERIAL_AIR) continue;

				const material = this._palette[mat];
				if (!material) continue;

				g.rect(lx * ts, ly * ts, ts, ts);
				g.fill(material.color);
			}
		}

		chunk.dirty = false;
	}

	private _chunkKey(cx: number, cy: number): string {
		return `${cx},${cy}`;
	}
}
