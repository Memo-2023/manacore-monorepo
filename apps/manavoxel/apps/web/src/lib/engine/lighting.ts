/**
 * ManaVoxel Lighting System
 *
 * Renders a darkness overlay with radial light sources.
 * Emissive materials (torch, lava) and placed lights cast light.
 * Interiors are darker by default. Day/night cycle affects streets.
 */

import { Container, Graphics } from 'pixi.js';
import type { TilemapRenderer } from './tilemap';
import { type Material } from '@manavoxel/shared';

// ─── Light Source ─────────────────────────────────────────────

export interface LightSource {
	x: number; // world pixel position
	y: number;
	radius: number; // in world pixels
	color: string; // hex color
	intensity: number; // 0-1
}

// ─── Lighting Engine ──────────────────────────────────────────

export class LightingEngine {
	private _overlay: Graphics;
	private _container: Container;
	private _enabled = true;
	private _ambientLight = 1.0; // 0 = total darkness, 1 = full bright
	private _lights: LightSource[] = [];
	private _dirty = true;

	// Cache
	private _lastAmbient = -1;
	private _lastLightCount = -1;
	private _width = 0;
	private _height = 0;

	get enabled() {
		return this._enabled;
	}
	get ambientLight() {
		return this._ambientLight;
	}

	constructor(stage: Container) {
		this._container = stage;
		this._overlay = new Graphics();
		this._overlay.blendMode = 'multiply' as any;
		stage.addChild(this._overlay);
	}

	/** Set ambient light level (0 = pitch dark, 1 = full bright) */
	setAmbient(level: number) {
		const clamped = Math.max(0, Math.min(1, level));
		if (clamped !== this._ambientLight) {
			this._ambientLight = clamped;
			this._dirty = true;
		}
	}

	/** Toggle lighting on/off */
	toggle() {
		this._enabled = !this._enabled;
		this._overlay.visible = this._enabled;
		this._dirty = true;
	}

	/** Collect light sources from tilemap emissive materials + extra lights */
	collectLights(tilemap: TilemapRenderer, palette: Material[], extraLights?: LightSource[]) {
		this._lights = [];

		// Scan tilemap for emissive materials
		const tileSize = tilemap.tileSize;
		const w = tilemap.worldWidth;
		const h = tilemap.worldHeight;

		// Sample every 4th pixel for performance (emissive blocks are usually clustered)
		for (let y = 0; y < h; y += 4) {
			for (let x = 0; x < w; x += 4) {
				const mat = tilemap.getPixel(x, y);
				if (mat === 0) continue;
				const material = palette[mat];
				if (!material?.emissive) continue;

				this._lights.push({
					x: x * tileSize + tileSize * 2,
					y: y * tileSize + tileSize * 2,
					radius: (80 * tileSize) / 8, // ~80px at street zoom
					color: material.color,
					intensity: 0.9,
				});
			}
		}

		// Add extra lights (from entities, player torch, etc.)
		if (extraLights) {
			this._lights.push(...extraLights);
		}

		this._dirty = true;
	}

	/** Render the lighting overlay. Call once per frame if dirty. */
	render(
		screenWidth: number,
		screenHeight: number,
		cameraX: number,
		cameraY: number,
		cameraScale: number
	) {
		if (!this._enabled) return;

		// Only re-render if something changed
		const needsUpdate =
			this._dirty ||
			this._width !== screenWidth ||
			this._height !== screenHeight ||
			this._lastAmbient !== this._ambientLight ||
			this._lastLightCount !== this._lights.length;

		if (!needsUpdate) return;

		this._dirty = false;
		this._width = screenWidth;
		this._height = screenHeight;
		this._lastAmbient = this._ambientLight;
		this._lastLightCount = this._lights.length;

		const g = this._overlay;
		g.clear();

		// If fully bright and no darkness needed, skip
		if (this._ambientLight >= 0.95 && this._lights.length === 0) {
			g.visible = false;
			return;
		}
		g.visible = true;

		// Draw dark overlay covering the whole screen
		const darkness = 1 - this._ambientLight;
		if (darkness > 0.01) {
			const alpha = darkness * 0.85; // Max 85% darkness so it's never completely black
			g.rect(0, 0, screenWidth, screenHeight);
			g.fill({ color: 0x000000, alpha });
		}

		// Cut out light circles (draw bright circles that "erase" darkness)
		// Using multiply blend: we draw white circles where lights are
		for (const light of this._lights) {
			// Convert world position to screen position
			const screenX = (light.x - cameraX) * cameraScale + screenWidth / 2;
			const screenY = (light.y - cameraY) * cameraScale + screenHeight / 2;
			const screenRadius = light.radius * cameraScale;

			// Skip if off-screen
			if (
				screenX + screenRadius < 0 ||
				screenX - screenRadius > screenWidth ||
				screenY + screenRadius < 0 ||
				screenY - screenRadius > screenHeight
			)
				continue;

			// Draw light as a bright circle that reduces the darkness
			// Multiple concentric circles for gradient falloff
			const steps = 5;
			for (let i = steps; i >= 1; i--) {
				const ratio = i / steps;
				const r = screenRadius * ratio;
				const alpha = light.intensity * (1 - ratio) * 0.15;
				g.circle(screenX, screenY, r);
				g.fill({ color: this._hexToNum(light.color), alpha });
			}

			// Core bright spot
			g.circle(screenX, screenY, screenRadius * 0.3);
			g.fill({ color: 0xffffff, alpha: light.intensity * 0.1 });
		}
	}

	/** Move overlay to always be on top */
	moveToTop() {
		const parent = this._overlay.parent;
		if (parent) {
			parent.removeChild(this._overlay);
			parent.addChild(this._overlay);
		}
	}

	destroy() {
		this._overlay.destroy();
	}

	private _hexToNum(hex: string): number {
		return parseInt(hex.replace('#', ''), 16);
	}
}

// ─── Day/Night Cycle ──────────────────────────────────────────

export class DayNightCycle {
	private _time = 0.35; // 0-1, where 0.25=sunrise, 0.5=noon, 0.75=sunset, 0=midnight
	private _speed = 0.00002; // Time units per frame (~10 min real = 1 day)
	private _paused = false;

	/** Current time (0-1) */
	get time() {
		return this._time;
	}

	/** Is it currently "night" (for trigger purposes) */
	get isNight() {
		return this._time < 0.2 || this._time > 0.8;
	}

	/** Is it currently "day" */
	get isDay() {
		return this._time >= 0.25 && this._time <= 0.75;
	}

	/** Human-readable time string (HH:MM) */
	get timeString(): string {
		const hours = Math.floor(this._time * 24);
		const minutes = Math.floor((this._time * 24 - hours) * 60);
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
	}

	/** Get ambient light level based on time of day */
	get ambientLevel(): number {
		// Smooth curve: dark at night, bright during day
		// 0.0 = midnight (dark), 0.25 = sunrise, 0.5 = noon (bright), 0.75 = sunset, 1.0 = midnight
		const t = this._time;

		if (t >= 0.25 && t <= 0.75) {
			// Daytime: full brightness
			return 1.0;
		} else if (t > 0.75) {
			// Sunset → midnight: 1.0 → 0.15
			const progress = (t - 0.75) / 0.25;
			return 1.0 - progress * 0.85;
		} else if (t < 0.2) {
			// Night: minimal light
			return 0.15;
		} else {
			// Sunrise: 0.15 → 1.0
			const progress = (t - 0.2) / 0.05;
			return 0.15 + progress * 0.85;
		}
	}

	/** Advance time by one frame. Returns true if day/night just changed. */
	update(): { changed: boolean; becameNight: boolean; becameDay: boolean } {
		if (this._paused) return { changed: false, becameNight: false, becameDay: false };

		const wasNight = this.isNight;
		const wasDay = this.isDay;

		this._time = (this._time + this._speed) % 1;

		const isNightNow = this.isNight;
		const isDayNow = this.isDay;

		return {
			changed: wasNight !== isNightNow || wasDay !== isDayNow,
			becameNight: !wasNight && isNightNow,
			becameDay: !wasDay && isDayNow,
		};
	}

	/** Set time directly (0-1) */
	setTime(t: number) {
		this._time = ((t % 1) + 1) % 1;
	}

	/** Set cycle speed */
	setSpeed(speed: number) {
		this._speed = speed;
	}

	togglePause() {
		this._paused = !this._paused;
	}

	get paused() {
		return this._paused;
	}
}
