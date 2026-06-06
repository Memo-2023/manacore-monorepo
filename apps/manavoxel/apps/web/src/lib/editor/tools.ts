import type { TilemapRenderer } from '$lib/engine/tilemap';

// ─── Undo/Redo System ───────────────────────────────────────

export interface PixelChange {
	x: number;
	y: number;
	oldMaterial: number;
	newMaterial: number;
}

export class UndoStack {
	private _undoStack: PixelChange[][] = [];
	private _redoStack: PixelChange[][] = [];
	private _currentBatch: PixelChange[] = [];
	private _maxSize = 50;

	/** Start collecting changes for a single user action */
	beginBatch() {
		this._currentBatch = [];
	}

	/** Record a single pixel change within the current batch */
	record(x: number, y: number, oldMaterial: number, newMaterial: number) {
		if (oldMaterial === newMaterial) return;
		this._currentBatch.push({ x, y, oldMaterial, newMaterial });
	}

	/** Commit the current batch as one undo-able action */
	commitBatch() {
		if (this._currentBatch.length === 0) return;
		this._undoStack.push(this._currentBatch);
		if (this._undoStack.length > this._maxSize) {
			this._undoStack.shift();
		}
		this._redoStack = []; // Clear redo on new action
		this._currentBatch = [];
	}

	get canUndo() {
		return this._undoStack.length > 0;
	}
	get canRedo() {
		return this._redoStack.length > 0;
	}

	undo(tilemap: TilemapRenderer) {
		const batch = this._undoStack.pop();
		if (!batch) return;
		for (let i = batch.length - 1; i >= 0; i--) {
			const c = batch[i];
			tilemap.setPixel(c.x, c.y, c.oldMaterial);
		}
		this._redoStack.push(batch);
	}

	redo(tilemap: TilemapRenderer) {
		const batch = this._redoStack.pop();
		if (!batch) return;
		for (const c of batch) {
			tilemap.setPixel(c.x, c.y, c.newMaterial);
		}
		this._undoStack.push(batch);
	}
}

// ─── Editor Tools ───────────────────────────────────────────

export type ToolType = 'brush' | 'eraser' | 'fill' | 'pipette' | 'box' | 'line' | 'npc';

/**
 * Place a single pixel (or brush area), recording to undo stack.
 */
export function brushStroke(
	tilemap: TilemapRenderer,
	undo: UndoStack,
	cx: number,
	cy: number,
	material: number,
	size: number
) {
	const radius = Math.floor(size / 2);
	for (let dy = -radius; dy <= radius; dy++) {
		for (let dx = -radius; dx <= radius; dx++) {
			const x = cx + dx;
			const y = cy + dy;
			if (x < 0 || x >= tilemap.worldWidth || y < 0 || y >= tilemap.worldHeight) continue;
			const old = tilemap.getPixel(x, y);
			undo.record(x, y, old, material);
			tilemap.setPixel(x, y, material);
		}
	}
}

/**
 * Flood fill from a starting position.
 * Replaces all connected pixels of the same material with the new material.
 */
export function floodFill(
	tilemap: TilemapRenderer,
	undo: UndoStack,
	startX: number,
	startY: number,
	fillMaterial: number
) {
	const targetMaterial = tilemap.getPixel(startX, startY);
	if (targetMaterial === fillMaterial) return;

	const stack: [number, number][] = [[startX, startY]];
	const visited = new Set<string>();
	const maxIterations = 50_000; // Safety limit
	let iterations = 0;

	while (stack.length > 0 && iterations < maxIterations) {
		const [x, y] = stack.pop()!;
		const key = `${x},${y}`;
		if (visited.has(key)) continue;
		visited.add(key);

		if (x < 0 || x >= tilemap.worldWidth || y < 0 || y >= tilemap.worldHeight) continue;
		if (tilemap.getPixel(x, y) !== targetMaterial) continue;

		undo.record(x, y, targetMaterial, fillMaterial);
		tilemap.setPixel(x, y, fillMaterial);

		stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
		iterations++;
	}
}

/**
 * Pipette: Pick the material at a position.
 * Returns the material ID.
 */
export function pipette(tilemap: TilemapRenderer, x: number, y: number): number {
	return tilemap.getPixel(x, y);
}

/**
 * Draw a filled rectangle from corner to corner.
 */
export function boxFill(
	tilemap: TilemapRenderer,
	undo: UndoStack,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	material: number
) {
	const minX = Math.max(0, Math.min(x1, x2));
	const maxX = Math.min(tilemap.worldWidth - 1, Math.max(x1, x2));
	const minY = Math.max(0, Math.min(y1, y2));
	const maxY = Math.min(tilemap.worldHeight - 1, Math.max(y1, y2));

	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			const old = tilemap.getPixel(x, y);
			undo.record(x, y, old, material);
			tilemap.setPixel(x, y, material);
		}
	}
}

/**
 * Draw a line from (x1,y1) to (x2,y2) using Bresenham's algorithm.
 */
export function lineDraw(
	tilemap: TilemapRenderer,
	undo: UndoStack,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	material: number,
	brushSize: number
) {
	const dx = Math.abs(x2 - x1);
	const dy = -Math.abs(y2 - y1);
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;
	let err = dx + dy;

	let cx = x1;
	let cy = y1;

	while (true) {
		brushStroke(tilemap, undo, cx, cy, material, brushSize);
		if (cx === x2 && cy === y2) break;
		const e2 = 2 * err;
		if (e2 >= dy) {
			err += dy;
			cx += sx;
		}
		if (e2 <= dx) {
			err += dx;
			cy += sy;
		}
	}
}
