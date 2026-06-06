import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Camera } from './camera';
import { InputManager } from './input';
import { TilemapRenderer } from './tilemap';
import { Player } from './player';
import { ParticleSystem } from './particles';
import { AreaManager, generateDemoStreet, generateDemoInterior } from './area-manager';
import { UndoStack, brushStroke, floodFill, pipette, type ToolType } from '$lib/editor/tools';
import { DEFAULT_MATERIALS, MATERIAL_AIR, type Material } from '@manavoxel/shared';
import type { Inventory } from './inventory.svelte';
import { GameEventBus, BehaviorRuntime, type ActionContext, type GameEvent } from './behavior';
import { playSound } from './audio';
import { NPCManager } from './npc';
import { LightingEngine, DayNightCycle } from './lighting';
import { DialogManager } from './dialog';

export class GameEngine {
	app: Application;
	camera: Camera;
	input: InputManager;
	tilemap!: TilemapRenderer;
	player: Player | null = null;
	undo: UndoStack;
	areaManager: AreaManager;
	particles: ParticleSystem;
	inventory: Inventory | null = null;
	eventBus: GameEventBus;
	behaviorRuntime: BehaviorRuntime;
	npcManager: NPCManager;
	lighting: LightingEngine;
	dayNight: DayNightCycle;
	dialog: DialogManager;

	private _container: HTMLDivElement;
	private _worldContainer: Container;
	private _fadeOverlay: Graphics;
	private _messageText: Text | null = null;
	private _messageTimer = 0;
	private _initialized = false;
	private _useItemCooldown = 0;

	// Editor state
	private _editing = false;
	private _selectedMaterial = 1;
	private _activeTool: ToolType = 'brush';
	private _brushSize = 1;
	private _palette: Material[] = DEFAULT_MATERIALS;
	private _painting = false;
	private _npcBehavior = 'hostile'; // For NPC placement tool

	// Area state
	private _currentFloor = 0;
	private _areaName = '';

	// Callbacks for UI reactivity
	onStateChange: (() => void) | null = null;
	onNpcDeath: ((npcX: number, npcY: number, behavior: string) => void) | null = null;

	get isEditing() {
		return this._editing;
	}
	get selectedMaterial() {
		return this._selectedMaterial;
	}
	get activeTool() {
		return this._activeTool;
	}
	get brushSize() {
		return this._brushSize;
	}
	get palette() {
		return this._palette;
	}
	get currentFloor() {
		return this._currentFloor;
	}
	get totalFloors() {
		return this.areaManager.currentArea?.data.floors ?? 1;
	}
	get npcBehavior() {
		return this._npcBehavior;
	}
	get areaName() {
		return this._areaName;
	}

	constructor(
		container: HTMLDivElement,
		worldData?: { world: { startAreaId: string }; areas: import('@manavoxel/shared').Area[] }
	) {
		this._container = container;
		this.app = new Application();
		this._worldContainer = new Container();
		this._fadeOverlay = new Graphics();
		this.undo = new UndoStack();

		this.camera = new Camera(this._worldContainer);
		this.input = new InputManager(container);
		this.areaManager = new AreaManager(this._worldContainer);
		this.particles = new ParticleSystem(this._worldContainer);
		this.eventBus = new GameEventBus();
		this.behaviorRuntime = new BehaviorRuntime(this.eventBus);
		this.npcManager = new NPCManager(this._worldContainer);
		this.lighting = new LightingEngine(this.app.stage);
		this.dayNight = new DayNightCycle();
		this.dialog = new DialogManager();

		this._init(worldData);
	}

	private async _init(worldData?: {
		world: { startAreaId: string };
		areas: import('@manavoxel/shared').Area[];
	}) {
		await this.app.init({
			resizeTo: this._container,
			background: '#1a1a2e',
			antialias: false,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
		});

		this._container.appendChild(this.app.canvas);
		this.app.stage.addChild(this._worldContainer);

		// Fade overlay (on top of world, for transitions)
		this._fadeOverlay.rect(0, 0, 1, 1);
		this._fadeOverlay.fill('#000000');
		this.app.stage.addChild(this._fadeOverlay);
		this._fadeOverlay.visible = false;

		// Load areas: from DB if available, otherwise generate demo
		let startAreaId: string;

		if (worldData && worldData.areas.length > 0) {
			for (const area of worldData.areas) {
				this.areaManager.registerArea(area);
			}
			startAreaId = worldData.world.startAreaId;
		} else {
			const street = generateDemoStreet();
			const interiorId = street.portals[0]?.targetAreaId;
			const interior = generateDemoInterior(interiorId!, street.id);
			this.areaManager.registerArea(street);
			this.areaManager.registerArea(interior);
			startAreaId = street.id;
		}

		// Area change callback
		this.areaManager.onAreaChanged = (loaded) => {
			this.tilemap = loaded.tilemap;
			this._currentFloor = loaded.currentFloor;
			this._areaName = loaded.data.name;

			// Spawn NPCs from area entities
			this.npcManager.spawnFromEntities(loaded.data.entities, loaded.tilemap);

			// Collect light sources and set ambient based on area type
			this.lighting.collectLights(loaded.tilemap, this._palette);
			if (loaded.data.type === 'interior') {
				this.lighting.setAmbient(0.2); // Interiors are dark
			}

			// Recreate player in new area
			this.player?.destroy();
			this.player = new Player(
				this._worldContainer,
				this.tilemap,
				loaded.data.spawnPoint.x,
				loaded.data.spawnPoint.y
			);

			this.onStateChange?.();
		};

		// Load starting area
		const loaded = this.areaManager.loadArea(startAreaId);
		if (loaded) {
			this.tilemap = loaded.tilemap;
			this._areaName = loaded.data.name;
			this.player = new Player(
				this._worldContainer,
				this.tilemap,
				loaded.data.spawnPoint.x,
				loaded.data.spawnPoint.y
			);
			this.camera.setPosition(this.player.worldX, this.player.worldY);
		}

		// Game loop
		this.app.ticker.add((ticker) => this._update(ticker.deltaTime));

		this._initialized = true;
		this.onStateChange?.();
	}

	private _update(_dt: number) {
		if (!this._initialized) return;

		if (this._editing) {
			this._updateEditor();
		} else {
			this._updateGame();
		}

		// Zoom
		const scrollDelta = this.input.consumeScroll();
		if (scrollDelta !== 0) {
			this.camera.zoom(scrollDelta > 0 ? 0.9 : 1.1);
		}

		// Undo/Redo (Ctrl+Z / Ctrl+Y)
		if (this.input.isKeyDown('KeyZ') && this.input.isKeyDown('ControlLeft')) {
			if (this.input.isKeyDown('ShiftLeft')) {
				this.undo.redo(this.tilemap);
			} else {
				this.undo.undo(this.tilemap);
			}
		}
		if (this.input.isKeyDown('KeyY') && this.input.isKeyDown('ControlLeft')) {
			this.undo.redo(this.tilemap);
		}

		// Update particles
		this.particles.update();

		// Cooldown tick
		if (this._useItemCooldown > 0) this._useItemCooldown--;

		// Update message overlay
		if (this._messageText && this._messageTimer > 0) {
			this._messageTimer--;
			this._messageText.x = this.app.screen.width / 2;
			this._messageText.y = this.app.screen.height - 80;
			this._messageText.alpha = Math.min(1, this._messageTimer / 30);
			if (this._messageTimer <= 0) {
				this._messageText.destroy();
				this._messageText = null;
			}
		}

		this.camera.update(this.app.screen.width, this.app.screen.height);

		// Day/Night cycle (only on streets)
		const area = this.areaManager.currentArea;
		if (area && area.data.type === 'street') {
			const dnResult = this.dayNight.update();
			this.lighting.setAmbient(this.dayNight.ambientLevel);

			// Fire onDayNight trigger for all inventory items
			if (dnResult.changed) {
				this._fireEventForAllItems('onDayNight');
			}
		}

		// Render lighting overlay
		this.lighting.render(
			this.app.screen.width,
			this.app.screen.height,
			this.camera.x,
			this.camera.y,
			this.camera.scale
		);
		this.lighting.moveToTop();
	}

	private _updateGame() {
		// Don't process input during transitions
		if (this.areaManager.isTransitioning) {
			this.areaManager.update(1);
			this._updateFadeOverlay();
			return;
		}

		// Player movement
		let dx = 0;
		let dy = 0;
		if (this.input.isKeyDown('KeyW') || this.input.isKeyDown('ArrowUp')) dy = -1;
		if (this.input.isKeyDown('KeyS') || this.input.isKeyDown('ArrowDown')) dy = 1;
		if (this.input.isKeyDown('KeyA') || this.input.isKeyDown('ArrowLeft')) dx = -1;
		if (this.input.isKeyDown('KeyD') || this.input.isKeyDown('ArrowRight')) dx = 1;

		if (this.player) {
			this.player.move(dx, dy);

			// Check for portal collision
			const portal = this.areaManager.checkPortals(
				this.player.x,
				this.player.y,
				this._currentFloor
			);
			if (portal && this.input.isKeyDown('KeyE')) {
				// Check if portal requires a key item
				if (portal.requiresKey && !this.inventory?.hasItem(portal.requiresKey)) {
					this.showMessage('You need a key to enter here.');
				} else {
					this.areaManager.enterPortal(portal, this.player);
					// Fire onAreaEnter for held item
					if (this.inventory?.heldItem) {
						this._fireItemEvent('onAreaEnter', this.inventory.heldItem);
					}
				}
			}

			// Talk to nearby NPCs (E key, non-hostile only)
			if (this.input.isKeyDown('KeyE') && !portal && !this.dialog.active) {
				const nearNpc = this.npcManager.getNpcAt(
					this.player.worldX,
					this.player.worldY,
					15 * this.tilemap.tileSize
				);
				if (nearNpc && !nearNpc.isDead && nearNpc.behavior !== 'hostile') {
					this.dialog.open(nearNpc.behavior);
					playSound('pickup');
					this.onStateChange?.();
				}
			}

			// Don't process other input during dialog
			if (this.dialog.active) {
				// Camera still follows player
				const lerpSpeed = 0.1;
				const cx = this.camera.x + (this.player.worldX - this.camera.x) * lerpSpeed;
				const cy = this.camera.y + (this.player.worldY - this.camera.y) * lerpSpeed;
				this.camera.setPosition(cx, cy);
				return;
			}

			// Check for stairs (floor switch via E key on stair tiles)
			if (this.input.isKeyDown('KeyF') && this.totalFloors > 1) {
				const nextFloor = (this._currentFloor + 1) % this.totalFloors;
				this.areaManager.switchFloor(nextFloor);
				this._currentFloor = nextFloor;
				this.onStateChange?.();
			}

			// Use held item (Space key)
			if (this.input.isKeyDown('Space') && this._useItemCooldown <= 0 && this.inventory) {
				const heldItem = this.inventory.heldItem;
				if (heldItem) {
					this._useItemCooldown = Math.max(5, Math.round(30 / heldItem.properties.speed));

					// Fire onUse event — behaviors handle the effects
					this._fireItemEvent('onUse', heldItem);

					// Default behavior if no behaviors defined: use item properties directly
					if (!heldItem.behaviors || heldItem.behaviors.length === 0) {
						this._defaultItemUse(heldItem);
					}
				}
			}

			// Timer-based behaviors for held item
			if (this.inventory?.heldItem) {
				const heldItem = this.inventory.heldItem;
				for (const behavior of heldItem.behaviors ?? []) {
					if (behavior.trigger.type === 'onTimer') {
						const seconds = Number(behavior.trigger.params.seconds ?? 1);
						const intervalFrames = Math.round(seconds * 60);
						if (
							this.eventBus.tickTimer(`${heldItem.id}_${behavior.trigger.type}`, intervalFrames)
						) {
							this._fireItemEvent('onTimer', heldItem);
						}
					}
				}
			}

			// Update NPCs
			const npcResult = this.npcManager.update(this.player.x, this.player.y, this._currentFloor);

			// NPC contact damage to player
			for (const npc of npcResult.attackingNpcs) {
				this.player.hp = Math.max(0, this.player.hp - npc.damage);
				playSound('hit_default');
				this.particles.spawn('sparks', this.player.worldX, this.player.worldY);
				this.onStateChange?.();
			}

			// Fire onTouch for all inventory items when touching NPCs
			if (npcResult.touchingNpcs.length > 0) {
				this._fireEventForAllItems('onTouch');
			}

			// Item-use damages NPCs in range
			if (this.input.isKeyDown('Space') && this._useItemCooldown <= 1 && this.inventory?.heldItem) {
				const heldItem = this.inventory.heldItem;
				if (heldItem.properties.damage > 0) {
					const effectDistance = 10 + heldItem.properties.range * 3;
					const dirOffsets = [
						{ dx: 0, dy: -effectDistance },
						{ dx: effectDistance, dy: 0 },
						{ dx: 0, dy: effectDistance },
						{ dx: -effectDistance, dy: 0 },
					];
					const off = dirOffsets[this.player.direction] ?? dirOffsets[2];
					const hitX = this.player.worldX + off.dx;
					const hitY = this.player.worldY + off.dy;

					const hitRange = (heldItem.properties.range + 2) * this.tilemap.tileSize;
					const target = this.npcManager.getNpcAt(hitX, hitY, hitRange);
					if (target) {
						const died = target.takeDamage(heldItem.properties.damage);
						playSound('hit_sword');
						this.particles.spawn(
							this._elementParticle(heldItem.properties.element),
							target.worldX,
							target.worldY
						);
						if (died) {
							playSound('explosion');
							this.particles.spawn('shatter', target.worldX, target.worldY);
							this.showMessage(`Defeated ${target.behavior} NPC!`);
							this.onNpcDeath?.(target.worldX, target.worldY, target.behavior);
						}
					}
				}
			}

			// Cleanup dead NPCs periodically
			if (this._useItemCooldown === 0) {
				this.npcManager.cleanupDead();
			}

			// Camera follows player smoothly
			const lerpSpeed = 0.1;
			const cx = this.camera.x + (this.player.worldX - this.camera.x) * lerpSpeed;
			const cy = this.camera.y + (this.player.worldY - this.camera.y) * lerpSpeed;
			this.camera.setPosition(cx, cy);
		}
	}

	private _updateFadeOverlay() {
		if (this.areaManager.isTransitioning) {
			this._fadeOverlay.visible = true;
			this._fadeOverlay.alpha = 1 - this.areaManager.transitionAlpha;
			this._fadeOverlay.clear();
			this._fadeOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
			this._fadeOverlay.fill('#000000');
		} else {
			this._fadeOverlay.visible = false;
		}
	}

	private _updateEditor() {
		// Camera pan with WASD in editor mode
		const moveSpeed = 4;
		if (this.input.isKeyDown('KeyW') || this.input.isKeyDown('ArrowUp'))
			this.camera.move(0, -moveSpeed);
		if (this.input.isKeyDown('KeyS') || this.input.isKeyDown('ArrowDown'))
			this.camera.move(0, moveSpeed);
		if (this.input.isKeyDown('KeyA') || this.input.isKeyDown('ArrowLeft'))
			this.camera.move(-moveSpeed, 0);
		if (this.input.isKeyDown('KeyD') || this.input.isKeyDown('ArrowRight'))
			this.camera.move(moveSpeed, 0);

		// Get world position under cursor
		const worldPos = this.camera.screenToWorld(
			this.input.mouseX,
			this.input.mouseY,
			this.app.screen.width,
			this.app.screen.height
		);
		const tileX = Math.floor(worldPos.x / this.tilemap.tileSize);
		const tileY = Math.floor(worldPos.y / this.tilemap.tileSize);

		// Handle mouse actions
		if (this.input.isMouseDown) {
			const material =
				this.input.mouseButton === 2 || this._activeTool === 'eraser'
					? MATERIAL_AIR
					: this._selectedMaterial;

			if (!this._painting) {
				// Start a new paint stroke
				this._painting = true;
				this.undo.beginBatch();
			}

			switch (this._activeTool) {
				case 'brush':
				case 'eraser':
					brushStroke(this.tilemap, this.undo, tileX, tileY, material, this._brushSize);
					break;
				case 'fill':
					// Fill only on initial click (not drag)
					if (this.input.justPressed) {
						floodFill(this.tilemap, this.undo, tileX, tileY, material);
					}
					break;
				case 'pipette':
					if (this.input.justPressed) {
						const picked = pipette(this.tilemap, tileX, tileY);
						if (picked !== MATERIAL_AIR) {
							this._selectedMaterial = picked;
							this._activeTool = 'brush'; // Switch back to brush after pick
							this.onStateChange?.();
						}
					}
					break;
				case 'npc':
					if (this.input.justPressed) {
						this._placeNpc(tileX, tileY);
					}
					break;
			}
		} else if (this._painting) {
			// Mouse released: commit the undo batch
			this._painting = false;
			this.undo.commitBatch();
		}
	}

	// ─── Behavior Helpers ──────────────────────────────────

	/** Fire a game event for an item and let behaviors handle it */
	private _fireItemEvent(
		type: import('./behavior').GameEventType,
		item: import('./inventory.svelte').GameItem
	) {
		if (!this.player) return;

		const event: GameEvent = {
			type,
			item,
			playerX: this.player.worldX,
			playerY: this.player.worldY,
			playerDirection: this.player.direction,
			playerHp: this.player.hp,
		};
		this.eventBus.emit(event);
	}

	/** Fire an event for all items in inventory (for passive triggers like onDayNight, onTouch) */
	private _fireEventForAllItems(type: import('./behavior').GameEventType) {
		if (!this.inventory) return;
		for (const item of this.inventory.slots) {
			if (item) this._fireItemEvent(type, item);
		}
	}

	/** Create an ActionContext for behavior execution */
	private _createActionContext(item: import('./inventory.svelte').GameItem): ActionContext {
		return {
			playerX: this.player?.worldX ?? 0,
			playerY: this.player?.worldY ?? 0,
			playerDirection: this.player?.direction ?? 2,
			playerHp: this.player?.hp ?? 100,
			setPlayerHp: (hp: number) => {
				if (this.player) {
					this.player.hp = hp;
					this.onStateChange?.();
				}
			},
			teleportPlayer: (x: number, y: number) => {
				if (this.player) {
					this.player.x = x;
					this.player.y = y;
				}
			},
			setPixel: (x: number, y: number, material: number) => {
				this.tilemap.setPixel(x, y, material);
			},
			getPixel: (x: number, y: number) => {
				return this.tilemap.getPixel(x, y);
			},
			tileSize: this.tilemap.tileSize,
			spawnParticles: (type: string, x: number, y: number) => {
				this.particles.spawn(type, x, y);
			},
			shakeCamera: (intensity: number, duration: number) => {
				this.camera.shake(intensity, duration);
			},
			showMessage: (text: string) => {
				this.showMessage(text);
			},
			item,
		};
	}

	/** Map element type to default particle effect */
	private _elementParticle(element: string): string {
		switch (element) {
			case 'fire':
				return 'fire_burst';
			case 'ice':
				return 'ice_shards';
			case 'poison':
				return 'poison_cloud';
			case 'lightning':
				return 'lightning_bolt';
			default:
				return 'sparks';
		}
	}

	/** Default item use when no behaviors are defined (backwards-compatible) */
	private _defaultItemUse(item: import('./inventory.svelte').GameItem) {
		if (!this.player) return;
		if (item.properties.damage <= 0 && item.properties.particle === 'none') return;

		// Range determines effect distance (range 1 = 10px, range 10 = 40px)
		const effectDistance = 10 + item.properties.range * 3;
		const dirOffsets = [
			{ dx: 0, dy: -effectDistance },
			{ dx: effectDistance, dy: 0 },
			{ dx: 0, dy: effectDistance },
			{ dx: -effectDistance, dy: 0 },
		];
		const off = dirOffsets[this.player.direction] ?? dirOffsets[2];
		const effectX = this.player.worldX + off.dx;
		const effectY = this.player.worldY + off.dy;

		// Play item sound
		playSound(item.properties.sound || 'hit_default');

		// Spawn particles — use element-based particles if no explicit particle set
		const particleType = item.properties.particle;
		if (particleType && particleType !== 'none') {
			this.particles.spawn(particleType, effectX, effectY);
		} else if (item.properties.damage > 0) {
			this.particles.spawn(this._elementParticle(item.properties.element), effectX, effectY);
		}

		// Pixel destruction
		if (item.properties.damage >= 20) {
			const tileX = Math.floor(effectX / this.tilemap.tileSize);
			const tileY = Math.floor(effectY / this.tilemap.tileSize);
			const radius = Math.min(3, Math.floor(item.properties.damage / 30));
			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					if (Math.abs(dx) + Math.abs(dy) <= radius) {
						this.tilemap.setPixel(tileX + dx, tileY + dy, MATERIAL_AIR);
					}
				}
			}
		}

		// Durability: reduce and break if depleted
		if (item.properties.durabilityMax > 0) {
			item.properties.durabilityCurrent = Math.max(0, item.properties.durabilityCurrent - 1);
			if (item.properties.durabilityCurrent <= 0) {
				// Item breaks — remove from inventory
				playSound('break');
				this.particles.spawn('shatter', this.player.worldX, this.player.worldY);
				if (this.inventory) {
					const slotIdx = this.inventory.slots.findIndex((s) => s?.id === item.id);
					if (slotIdx >= 0) this.inventory.removeItem(slotIdx);
				}
				this.showMessage(`${item.name} broke!`);
			}
		}
	}

	/** Show a floating message on screen */
	showMessage(text: string) {
		if (this._messageText) {
			this._messageText.destroy();
		}
		this._messageText = new Text({
			text,
			style: new TextStyle({
				fontSize: 16,
				fill: '#ffffff',
				fontFamily: 'monospace',
				dropShadow: { color: '#000000', blur: 4, distance: 1, angle: Math.PI / 4 },
			}),
		});
		this._messageText.anchor.set(0.5, 1);
		this.app.stage.addChild(this._messageText);
		this._messageTimer = 180; // ~3 seconds
	}

	/** Register behaviors for all inventory items + wire inventory callbacks */
	registerItemBehaviors() {
		this.behaviorRuntime.destroy();
		if (!this.inventory) return;

		for (const item of this.inventory.slots) {
			if (!item || !item.behaviors || item.behaviors.length === 0) continue;
			this.behaviorRuntime.registerItem(item, item.behaviors, () =>
				this._createActionContext(item)
			);
		}

		// Wire inventory pickup/drop events
		this.inventory.onPickup = (item) => {
			this._fireItemEvent('onPickup', item);
		};
		this.inventory.onDrop = (item) => {
			this._fireItemEvent('onDrop', item);
		};
	}

	/** Place an NPC at tile position and add to area entities */
	private _placeNpc(tileX: number, tileY: number) {
		const area = this.areaManager.currentArea;
		if (!area) return;

		const entityDef: import('@manavoxel/shared').EntityDef = {
			id: crypto.randomUUID(),
			type: 'npc',
			x: tileX,
			y: tileY,
			floor: this._currentFloor,
			properties: {
				behavior: this._npcBehavior,
				hp: this._npcBehavior === 'hostile' ? 30 : 50,
				damage: this._npcBehavior === 'hostile' ? 5 : 0,
			},
		};

		// Add to area data + spawn
		area.data.entities.push(entityDef);
		this.npcManager.addNpc(entityDef, area.tilemap);

		playSound('pickup');
		this.onStateChange?.();
	}

	// ─── Public API for UI ──────────────────────────────────

	toggleEditor() {
		this._editing = !this._editing;
		this.onStateChange?.();
	}

	setMaterial(materialId: number) {
		this._selectedMaterial = materialId;
		this.onStateChange?.();
	}

	setTool(tool: ToolType) {
		this._activeTool = tool;
		this.onStateChange?.();
	}

	setBrushSize(size: number) {
		this._brushSize = Math.max(1, Math.min(9, size));
		this.onStateChange?.();
	}

	setNpcBehavior(behavior: string) {
		this._npcBehavior = behavior;
		this.onStateChange?.();
	}

	destroy() {
		this.behaviorRuntime.destroy();
		this.eventBus.destroy();
		this.npcManager.clear();
		this.lighting.destroy();
		this.player?.destroy();
		this.input.destroy();
		this.app.destroy(true);
	}
}
