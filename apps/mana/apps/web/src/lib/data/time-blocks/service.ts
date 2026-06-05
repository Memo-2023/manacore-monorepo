/**
 * TimeBlock Service — shared CRUD helper called by all module stores.
 *
 * Module stores create both their domain record and a timeBlock in the same
 * Dexie transaction to keep them consistent.
 *
 * Phase 7.1 encryption: title + description are encrypted at rest. The
 * consumer modules (todo, calendar, times) flow their plaintext
 * snapshots through this service, which wraps them via encryptRecord
 * before the actual Dexie write — so every caller gets encryption for
 * free without touching their own code paths.
 *
 * `getBlock` returns the raw row (still encrypted). Read-paths must go
 * through queries.ts which calls decryptRecord on the way out, OR call
 * decryptBlock() explicitly if reading via getBlock for write-coupling
 * (e.g. startFromScheduled needs the plaintext title to copy it forward).
 */

import { db } from '$lib/data/database';
import { encryptRecord, decryptRecord } from '$lib/data/crypto';
import { timeBlockTable } from './collections';
import type { LocalTimeBlock, CreateTimeBlockInput, UpdateTimeBlockInput } from './types';

/** Create a new timeBlock and return its ID. */
export async function createBlock(input: CreateTimeBlockInput): Promise<string> {
	const now = new Date().toISOString();
	const id = crypto.randomUUID();

	const block: LocalTimeBlock = {
		id,
		startDate: input.startDate,
		endDate: input.endDate ?? null,
		allDay: input.allDay ?? false,
		isLive: input.isLive ?? false,
		timezone: input.timezone ?? null,
		recurrenceRule: input.recurrenceRule ?? null,
		kind: input.kind,
		type: input.type,
		sourceModule: input.sourceModule,
		sourceId: input.sourceId,
		linkedBlockId: input.linkedBlockId ?? null,
		title: input.title,
		description: input.description ?? null,
		color: input.color ?? null,
		icon: input.icon ?? null,
		projectId: input.projectId ?? null,
		createdAt: now,
	};

	// Encrypt configured fields (title + description) before write.
	// All other columns stay plaintext for indexed queries.
	await encryptRecord('timeBlocks', block);
	await timeBlockTable.add(block);
	return id;
}

/** Update an existing timeBlock. */
export async function updateBlock(id: string, input: UpdateTimeBlockInput): Promise<void> {
	const now = new Date().toISOString();
	const diff: Partial<LocalTimeBlock> = {
		...input,
	};
	await encryptRecord('timeBlocks', diff);
	await timeBlockTable.update(id, diff);
}

/** Soft-delete a timeBlock. */
export async function deleteBlock(id: string): Promise<void> {
	const now = new Date().toISOString();
	await timeBlockTable.update(id, {
		deletedAt: now,
	});
}

/** Link a scheduled block to a logged block (plan vs. reality). */
export async function linkBlocks(scheduledId: string, loggedId: string): Promise<void> {
	const now = new Date().toISOString();
	await db.transaction('rw', timeBlockTable, async () => {
		const scheduled = await timeBlockTable.get(scheduledId);
		const logged = await timeBlockTable.get(loggedId);
		if (!scheduled || !logged) throw new Error('Block not found');
		if (scheduled.kind !== 'scheduled') throw new Error('First block must be scheduled');
		if (logged.kind !== 'logged') throw new Error('Second block must be logged');

		await timeBlockTable.update(scheduledId, { linkedBlockId: loggedId });
		await timeBlockTable.update(loggedId, { linkedBlockId: scheduledId });
	});
}

/**
 * Start a logged block from a scheduled block (plan → reality).
 * Creates a new "logged" block linked to the scheduled one and returns its ID.
 */
export async function startFromScheduled(
	scheduledId: string,
	overrides?: { title?: string; color?: string; icon?: string; projectId?: string | null }
): Promise<string> {
	const scheduled = await timeBlockTable.get(scheduledId);
	if (!scheduled || scheduled.deletedAt) throw new Error('Scheduled block not found');

	// scheduled.title is encrypted on disk — decrypt before forwarding
	// to createBlock, otherwise the new logged block would carry the
	// already-encrypted blob through encryptRecord again. encryptRecord
	// is idempotent on already-encrypted strings, so this is defence-in-
	// depth: future code that compares titles needs the plaintext anyway.
	const decryptedScheduled = await decryptRecord('timeBlocks', { ...scheduled });

	const now = new Date().toISOString();
	const loggedId = await createBlock({
		startDate: now,
		endDate: null,
		isLive: true,
		kind: 'logged',
		type: scheduled.type,
		sourceModule: scheduled.sourceModule,
		sourceId: scheduled.sourceId,
		linkedBlockId: scheduledId,
		title: overrides?.title ?? decryptedScheduled.title,
		color: overrides?.color ?? scheduled.color ?? null,
		icon: overrides?.icon ?? scheduled.icon ?? null,
		projectId: overrides?.projectId ?? scheduled.projectId ?? null,
	});

	// Link back from scheduled → logged
	await timeBlockTable.update(scheduledId, { linkedBlockId: loggedId });

	return loggedId;
}

/**
 * Get a single timeBlock by ID. Returns the raw row WITH ciphertext
 * still in the encrypted columns — caller is responsible for calling
 * `decryptBlock` if they need the plaintext title/description.
 *
 * Read-paths via queries.ts already decrypt automatically; getBlock
 * is the explicit escape hatch for code that needs the row outside
 * a liveQuery (e.g. write-coupling helpers like startFromScheduled).
 */
export async function getBlock(id: string): Promise<LocalTimeBlock | undefined> {
	const block = await timeBlockTable.get(id);
	if (block?.deletedAt) return undefined;
	return block;
}

/**
 * Returns a decrypted copy of a single timeBlock — convenience for the
 * few callers that need plaintext title/description outside of the
 * liveQuery layer. Mutates a fresh copy, never the original row, so the
 * IndexedDB record stays encrypted.
 */
export async function decryptBlock(block: LocalTimeBlock): Promise<LocalTimeBlock> {
	return decryptRecord('timeBlocks', { ...block });
}
