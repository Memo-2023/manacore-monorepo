/**
 * Cross-type Drag & Drop system for Mana.
 *
 * Two layers:
 *  - Layer 1 (dragSource + dropTarget): Pointer-events based, for dragging items
 *    that are NOT already managed by svelte-dnd-action (e.g. Tag pills).
 *  - Layer 2 (passiveDropZone): Overlays on top of svelte-dnd-action drags,
 *    detecting when an already-dragged item hovers over an external target
 *    (e.g. dragging a Task onto a Tag pill or Trash zone).
 */

// ── Drag types ──────────────────────────────────────────────

export type DragType =
	| 'tag'
	| 'task'
	| 'card'
	| 'photo'
	| 'file'
	| 'event'
	| 'link'
	| 'contact'
	| 'note'
	| 'transaction'
	| 'place'
	| 'dream'
	| 'journal-entry'
	| 'first'
	| 'last'
	| 'draft';

export interface DragPayload<T = Record<string, unknown>> {
	type: DragType;
	data: T;
}

// ── Tag-specific payloads ───────────────────────────────────

export interface TagDragData {
	id: string;
	name: string;
	color: string;
}

export interface TaskDragData {
	id: string;
	title: string;
}

// ── dragSource options ──────────────────────────────────────

export interface DragSourceOptions {
	/** What kind of item is being dragged. */
	type: DragType;
	/** Returns the payload data. Called at drag start so it's always fresh. */
	data: () => Record<string, unknown>;
	/** Milliseconds to hold before drag starts on touch (default: 300). */
	longPressMs?: number;
	/** Pixels the pointer must move before drag starts on mouse (default: 5). */
	moveThreshold?: number;
	/** Whether dragging is currently disabled. */
	disabled?: boolean;
}

// ── dropTarget options ──────────────────────────────────────

export interface DropTargetOptions {
	/** Which drag types this target accepts. */
	accepts: DragType[];
	/** Called when an accepted item is dropped on this target. */
	onDrop: (payload: DragPayload) => void;
	/** Called while an accepted item hovers over this target. */
	onHover?: (payload: DragPayload) => void;
	/** Called when a dragged item leaves this target. */
	onLeave?: () => void;
	/** Return false to reject the drop (e.g. tag already assigned). */
	canDrop?: (payload: DragPayload) => boolean;
	/** Whether this target is currently disabled. */
	disabled?: boolean;
}

// ── passiveDropZone options ─────────────────────────────────

export interface PassiveDropZoneOptions {
	/** Which drag types this zone reacts to (from svelte-dnd-action drags). */
	accepts: DragType[];
	/** Called when an item is dropped on this zone. */
	onDrop: (payload: DragPayload) => void;
	/** Return false to reject the drop. */
	canDrop?: (payload: DragPayload) => boolean;
	/** CSS class applied while a valid item hovers over this zone. */
	highlightClass?: string;
	/** Whether this zone is currently disabled. */
	disabled?: boolean;
}

// ── ActionZone props ────────────────────────────────────────

export interface ActionZoneProps {
	/** Which drag types trigger this zone to appear. */
	accepts: DragType[];
	/** Called when an item is dropped on this zone. */
	onDrop: (payload: DragPayload) => void;
	/** Visual variant. */
	variant?: 'danger' | 'warning' | 'info' | 'success';
	/** Label text shown in the zone. */
	label?: string;
}
