/**
 * NPC System — Spawning, AI, Rendering, Combat
 *
 * NPCs are spawned from EntityDefs in area data.
 * Each NPC has HP, a simple AI state machine, and collision detection.
 */

import { Container, Graphics } from 'pixi.js';
import type { TilemapRenderer } from './tilemap';
import type { EntityDef } from '@manavoxel/shared';

// ─── Constants ────────────────────────────────────────────────

const NPC_WIDTH = 5;
const NPC_HEIGHT = 7;
const NPC_SPEED = 0.6;
const CHASE_SPEED = 1.0;
const CHASE_RANGE = 60; // pixels — NPC starts chasing player
const ATTACK_RANGE = 8; // pixels — NPC deals contact damage
const ATTACK_COOLDOWN = 90; // frames (~1.5s)
const PATROL_PAUSE = 120; // frames to wait at patrol point
const PATROL_DISTANCE = 40; // pixels to patrol from spawn

// NPC type → color mapping
const NPC_COLORS: Record<string, string> = {
	hostile: '#EF4444', // red
	passive: '#22C55E', // green
	merchant: '#EAB308', // yellow
	guard: '#3B82F6', // blue
};

// ─── AI States ────────────────────────────────────────────────

type AIState = 'idle' | 'patrol' | 'chase' | 'attack' | 'dead';

// ─── NPC Class ────────────────────────────────────────────────

export class NPC {
	id: string;
	x: number;
	y: number;
	spawnX: number;
	spawnY: number;
	floor: number;
	hp: number;
	maxHp: number;
	damage: number;
	direction = 2; // 0=up, 1=right, 2=down, 3=left
	behavior: string; // 'hostile' | 'passive' | 'merchant' | 'guard'

	state: AIState = 'idle';
	private _sprite: Container;
	private _body: Graphics;
	private _hpBar: Graphics;
	private _tilemap: TilemapRenderer;
	private _patrolTimer = 0;
	private _patrolDir = 1; // 1 or -1
	private _attackCooldown = 0;
	private _stateTimer = 0;
	private _dead = false;

	get worldX() {
		return this.x * this._tilemap.tileSize;
	}
	get worldY() {
		return this.y * this._tilemap.tileSize;
	}
	get isDead() {
		return this._dead;
	}

	constructor(worldContainer: Container, tilemap: TilemapRenderer, def: EntityDef) {
		this.id = def.id;
		this.x = def.x;
		this.y = def.y;
		this.spawnX = def.x;
		this.spawnY = def.y;
		this.floor = def.floor;
		this._tilemap = tilemap;

		const props = def.properties ?? {};
		this.hp = Number(props.hp ?? 30);
		this.maxHp = this.hp;
		this.damage = Number(props.damage ?? 5);
		this.behavior = String(props.behavior ?? 'hostile');

		// Determine initial AI state
		this.state = this.behavior === 'passive' || this.behavior === 'merchant' ? 'idle' : 'patrol';

		// Create sprite
		this._sprite = new Container();
		worldContainer.addChild(this._sprite);

		const color = NPC_COLORS[this.behavior] ?? NPC_COLORS.hostile;

		this._body = new Graphics();
		this._body.roundRect(0, 0, NPC_WIDTH * tilemap.tileSize, NPC_HEIGHT * tilemap.tileSize, 2);
		this._body.fill(color);
		this._sprite.addChild(this._body);

		// HP bar (above head)
		this._hpBar = new Graphics();
		this._sprite.addChild(this._hpBar);

		this._updateSpritePosition();
		this._drawHpBar();
	}

	/** Update NPC AI and movement each frame */
	update(
		playerX: number,
		playerY: number,
		playerFloor: number
	): { touching: boolean; attacking: boolean } {
		if (this._dead) return { touching: false, attacking: false };
		if (this._attackCooldown > 0) this._attackCooldown--;
		this._stateTimer++;

		const dx = playerX - this.x;
		const dy = playerY - this.y;
		const distToPlayer = Math.sqrt(dx * dx + dy * dy);
		const sameFloor = playerFloor === this.floor;

		// State transitions
		switch (this.state) {
			case 'idle':
				if (this.behavior === 'hostile' && sameFloor && distToPlayer < CHASE_RANGE) {
					this.state = 'chase';
					this._stateTimer = 0;
				}
				break;

			case 'patrol':
				this._updatePatrol();
				if (this.behavior === 'hostile' && sameFloor && distToPlayer < CHASE_RANGE) {
					this.state = 'chase';
					this._stateTimer = 0;
				}
				break;

			case 'chase':
				if (!sameFloor || distToPlayer > CHASE_RANGE * 1.5) {
					// Lost the player → go back to patrol
					this.state = 'patrol';
					this._stateTimer = 0;
				} else if (distToPlayer < ATTACK_RANGE) {
					this.state = 'attack';
					this._stateTimer = 0;
				} else {
					this._moveToward(playerX, playerY, CHASE_SPEED);
				}
				break;

			case 'attack':
				if (!sameFloor || distToPlayer > ATTACK_RANGE * 2) {
					this.state = 'chase';
					this._stateTimer = 0;
				}
				break;
		}

		this._updateSpritePosition();

		// Check touching
		const touching = sameFloor && distToPlayer < ATTACK_RANGE;

		// Attack logic
		let attacking = false;
		if (this.state === 'attack' && touching && this._attackCooldown <= 0) {
			this._attackCooldown = ATTACK_COOLDOWN;
			attacking = true;
		}

		return { touching, attacking };
	}

	/** Take damage. Returns true if NPC died. */
	takeDamage(amount: number): boolean {
		if (this._dead) return false;
		this.hp = Math.max(0, this.hp - amount);
		this._drawHpBar();

		if (this.hp <= 0) {
			this._dead = true;
			this._sprite.alpha = 0.3;
			this.state = 'dead';
			return true;
		}

		// Aggro on damage
		if (this.state === 'idle' || this.state === 'patrol') {
			this.state = 'chase';
		}
		return false;
	}

	destroy() {
		this._sprite.destroy({ children: true });
	}

	// ─── AI Movement ──────────────────────────────────────────

	private _updatePatrol() {
		this._patrolTimer++;

		if (this._patrolTimer < PATROL_PAUSE) return; // Wait at point

		// Move along patrol axis (horizontal)
		const targetX = this.spawnX + this._patrolDir * PATROL_DISTANCE;
		const dx = targetX - this.x;

		if (Math.abs(dx) < 1) {
			// Reached patrol point → flip and pause
			this._patrolDir *= -1;
			this._patrolTimer = 0;
		} else {
			this._moveToward(this.x + Math.sign(dx) * 100, this.y, NPC_SPEED);
		}
	}

	private _moveToward(targetX: number, targetY: number, speed: number) {
		const dx = targetX - this.x;
		const dy = targetY - this.y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < 0.5) return;

		const nx = (dx / dist) * speed;
		const ny = (dy / dist) * speed;

		// Update direction
		if (Math.abs(nx) > Math.abs(ny)) {
			this.direction = nx > 0 ? 1 : 3;
		} else {
			this.direction = ny > 0 ? 2 : 0;
		}

		// Try X movement
		const newX = this.x + nx;
		if (!this._collides(newX, this.y)) {
			this.x = newX;
		}

		// Try Y movement
		const newY = this.y + ny;
		if (!this._collides(this.x, newY)) {
			this.y = newY;
		}
	}

	private _collides(px: number, py: number): boolean {
		const m = 0.2;
		const l = px + m;
		const r = px + NPC_WIDTH - m;
		const t = py + m;
		const b = py + NPC_HEIGHT - m;
		return (
			this._tilemap.isSolid(Math.floor(l), Math.floor(t)) ||
			this._tilemap.isSolid(Math.floor(r), Math.floor(t)) ||
			this._tilemap.isSolid(Math.floor(l), Math.floor(b)) ||
			this._tilemap.isSolid(Math.floor(r), Math.floor(b))
		);
	}

	// ─── Rendering ────────────────────────────────────────────

	private _updateSpritePosition() {
		this._sprite.x = this.x * this._tilemap.tileSize;
		this._sprite.y = this.y * this._tilemap.tileSize;
	}

	private _drawHpBar() {
		const g = this._hpBar;
		const ts = this._tilemap.tileSize;
		const barW = NPC_WIDTH * ts;
		const barH = 2;
		const barY = -4;

		g.clear();

		// Background
		g.rect(0, barY, barW, barH);
		g.fill('#333333');

		// HP fill
		const ratio = this.hp / this.maxHp;
		const color = ratio > 0.6 ? '#22c55e' : ratio > 0.3 ? '#eab308' : '#ef4444';
		g.rect(0, barY, barW * ratio, barH);
		g.fill(color);
	}
}

// ─── NPC Manager ──────────────────────────────────────────────

export class NPCManager {
	private _npcs: NPC[] = [];
	private _worldContainer: Container;

	get npcs(): readonly NPC[] {
		return this._npcs;
	}

	constructor(worldContainer: Container) {
		this._worldContainer = worldContainer;
	}

	/** Add a single NPC from an entity definition */
	addNpc(def: EntityDef, tilemap: TilemapRenderer): NPC {
		const npc = new NPC(this._worldContainer, tilemap, def);
		this._npcs.push(npc);
		return npc;
	}

	/** Spawn NPCs from area entity definitions */
	spawnFromEntities(entities: EntityDef[], tilemap: TilemapRenderer) {
		this.clear();

		for (const def of entities) {
			if (def.type !== 'npc') continue;
			const npc = new NPC(this._worldContainer, tilemap, def);
			this._npcs.push(npc);
		}
	}

	/** Update all NPCs. Returns list of NPCs touching/attacking the player */
	update(
		playerX: number,
		playerY: number,
		playerFloor: number
	): { touchingNpcs: NPC[]; attackingNpcs: NPC[] } {
		const touchingNpcs: NPC[] = [];
		const attackingNpcs: NPC[] = [];

		for (const npc of this._npcs) {
			if (npc.isDead) continue;
			const result = npc.update(playerX, playerY, playerFloor);
			if (result.touching) touchingNpcs.push(npc);
			if (result.attacking) attackingNpcs.push(npc);
		}

		return { touchingNpcs, attackingNpcs };
	}

	/** Find NPC at a world position (for targeting with items) */
	getNpcAt(worldX: number, worldY: number, range: number): NPC | null {
		let closest: NPC | null = null;
		let closestDist = range;

		for (const npc of this._npcs) {
			if (npc.isDead) continue;
			const dx = npc.worldX - worldX;
			const dy = npc.worldY - worldY;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < closestDist) {
				closestDist = dist;
				closest = npc;
			}
		}

		return closest;
	}

	/** Remove dead NPCs from the list */
	cleanupDead() {
		const dead = this._npcs.filter((n) => n.isDead);
		for (const npc of dead) npc.destroy();
		this._npcs = this._npcs.filter((n) => !n.isDead);
	}

	clear() {
		for (const npc of this._npcs) npc.destroy();
		this._npcs = [];
	}
}
