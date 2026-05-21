/**
 * Me-Images store — mutation-only service.
 *
 * Reads happen via liveQuery helpers in queries.ts. Writes go through
 * this store so encryption (`label`, `tags`) and primary-slot swapping
 * stay in one place.
 *
 * Plan: docs/plans/me-images-and-reference-generation.md M1.
 */

import { encryptRecord } from '$lib/data/crypto';
import { emitDomainEvent } from '$lib/data/events';
import { scopedForModule, getActiveSpace } from '$lib/data/scope';
import { profileService } from '$lib/api/profile';
import { meImagesTable } from '../collections';
import { syncMeImagePrimaryToPlatform } from '../api/me-images';
import { toMeImage } from '../types';
import type {
	LocalMeImage,
	MeImage,
	MeImageKind,
	MeImagePrimarySlot,
	MeImageUsage,
} from '../types';

export interface CreateMeImageInput {
	kind: MeImageKind;
	mediaId: string;
	storagePath: string;
	publicUrl: string;
	thumbnailUrl?: string | null;
	width: number;
	height: number;
	label?: string;
	tags?: string[];
	usage?: Partial<MeImageUsage>;
	primaryFor?: MeImagePrimarySlot | null;
	/**
	 * Override the auto-stamped spaceId. Only the legacy-avatar
	 * migration needs this — it must pin the pre-M1 `auth.users.image`
	 * explicitly into the user's personal space regardless of which
	 * space happens to be active when the user first visits the route.
	 * Regular upload paths leave this unset and let the Dexie hook
	 * stamp the active space.
	 */
	spaceId?: string;
}

/**
 * Usage default on upload: `aiReference=false` (Opt-in per image is
 * the eigentliche Zustimmungsebene — plan decision #5) and
 * `showInProfile=true` so the image can back the avatar fallback even
 * before the user explicitly picks a primary.
 */
function defaultUsage(override?: Partial<MeImageUsage>): MeImageUsage {
	return {
		aiReference: override?.aiReference ?? false,
		showInProfile: override?.showInProfile ?? true,
	};
}

/**
 * After any primary-avatar-relevant change in the **personal** space,
 * push the current holder's publicUrl back to Better Auth so
 * `auth.users.image` stays in lockstep. Plan M2.5 — this is the only
 * path by which auth.users.image ever gets written from now on.
 *
 * After v40 (space-scope migration), avatar-primary is per-space; only
 * the personal-space holder represents the user's global SSO identity.
 * A primary-avatar change inside a brand/club/family/team/practice
 * space is local to that space and must NOT overwrite the Better Auth
 * record — otherwise switching into a brand space and picking a new
 * avatar would leak into the user's navigation/SSO identity elsewhere.
 *
 * The user's avatar follows their face-ref: "the photo we'd use to
 * generate you" is also "the photo we'd put next to your name in nav".
 * Previously `setPrimary(id, 'face-ref')` tried to coerce both slots
 * onto one row with a silent twin — but `primaryFor` is a single
 * column, so the avatar write clobbered the face-ref write and every
 * fresh upload ended up with `primaryFor='avatar'` and no face-ref at
 * all. We now keep face-ref as the single source of truth and only
 * fall back to the legacy `primaryFor='avatar'` row (written by the
 * pre-M2.5 legacy-avatar migration) when no face-ref exists yet.
 *
 * Best-effort: failures are logged and swallowed. The meImages row is
 * authoritative for the app's own avatar rendering, so a stale
 * auth.users.image is a cross-session degradation, not data loss.
 */
async function syncAvatarToAuth(): Promise<void> {
	try {
		const active = getActiveSpace();
		if (active?.type !== 'personal') return;
		const rows = await scopedForModule<LocalMeImage, string>('profile', 'meImages')
			.and((row) => row.primaryFor === 'face-ref' || row.primaryFor === 'avatar')
			.toArray();
		const visible = rows.filter((row) => !row.deletedAt);
		// Prefer the face-ref holder (current, user-uploaded) over the
		// legacy avatar row (migrated from the pre-M2.5 auth.users.image).
		const holder =
			visible.find((row) => row.primaryFor === 'face-ref') ??
			visible.find((row) => row.primaryFor === 'avatar');
		const nextImage = holder?.publicUrl ?? '';
		await profileService.updateProfile({ image: nextImage });
	} catch (err) {
		console.error('[profile] syncing avatar to Better Auth failed', err);
	}
}

/**
 * Internal: swap the primary holder of `slot` to `id` (or clear it
 * when id is null) in one transaction — *within the active space only*.
 * Extracted so `setPrimary` can reuse it when avatar silently follows
 * face-ref. After v40, "primary slot" is per-space; a setPrimary in
 * Brand-space must not clear Personal-space's holder.
 */
async function setPrimaryInTx(id: string | null, slot: MeImagePrimarySlot): Promise<void> {
	const nowIso = new Date().toISOString();
	await meImagesTable.db.transaction('rw', meImagesTable, async () => {
		const current = await scopedForModule<LocalMeImage, string>('profile', 'meImages')
			.and((row) => row.primaryFor === slot)
			.toArray();
		for (const row of current) {
			if (row.id === id) continue;
			await meImagesTable.update(row.id, { primaryFor: null });
		}
		if (id !== null) {
			await meImagesTable.update(id, { primaryFor: slot });
		}
	});
}

export const meImagesStore = {
	async createMeImage(input: CreateMeImageInput): Promise<MeImage> {
		const newLocal: LocalMeImage = {
			id: crypto.randomUUID(),
			kind: input.kind,
			label: input.label,
			mediaId: input.mediaId,
			storagePath: input.storagePath,
			publicUrl: input.publicUrl,
			thumbnailUrl: input.thumbnailUrl ?? null,
			width: input.width,
			height: input.height,
			tags: input.tags ?? [],
			usage: defaultUsage(input.usage),
			primaryFor: input.primaryFor ?? null,
		};
		// Pre-stamp the spaceId so the Dexie creating-hook leaves it
		// alone. Only the legacy-avatar migration uses this — regular
		// uploads let the hook stamp the active space.
		if (input.spaceId !== undefined) {
			newLocal.spaceId = input.spaceId;
		}
		const snapshot = toMeImage({ ...newLocal });
		await encryptRecord('meImages', newLocal);
		await meImagesTable.add(newLocal);
		emitDomainEvent('MeImageAdded', 'profile', 'meImages', newLocal.id, {
			meImageId: newLocal.id,
			kind: input.kind,
			primaryFor: newLocal.primaryFor,
		});
		return snapshot;
	},

	async updateMeImage(
		id: string,
		patch: Partial<Pick<LocalMeImage, 'label' | 'tags' | 'kind' | 'usage'>>
	): Promise<void> {
		const wrapped: Partial<LocalMeImage> = { ...patch };
		await encryptRecord('meImages', wrapped);
		await meImagesTable.update(id, wrapped);
	},

	/**
	 * Flip the per-image AI opt-in. Kept as its own method because
	 * it's the hottest privacy-relevant toggle in the Settings UI and
	 * warrants a dedicated event for audit.
	 */
	async setAiReferenceEnabled(id: string, enabled: boolean): Promise<void> {
		const existing = await meImagesTable.get(id);
		if (!existing) return;
		const nextUsage: MeImageUsage = {
			...defaultUsage(existing.usage),
			aiReference: enabled,
		};
		await meImagesTable.update(id, {
			usage: nextUsage,
		});
		emitDomainEvent('MeImageAiReferenceToggled', 'profile', 'meImages', id, {
			meImageId: id,
			enabled,
		});
	},

	/**
	 * Claim a primary slot for `id`, clearing any previous holder of
	 * the same slot in the same transaction. At most one image per
	 * slot is ever active — the query layer relies on this invariant.
	 *
	 * Pass `null` as the second argument to unset the slot on `id`
	 * without claiming it for anyone else.
	 *
	 * The user's avatar follows their face-ref via `syncAvatarToAuth`
	 * (which reads the face-ref holder directly) — no silent twin
	 * write, because `primaryFor` is a single-value column and the
	 * twin would overwrite the face-ref claim on the same row.
	 * Explicit avatar-only setPrimary calls (e.g. the legacy migration
	 * bootstrap that seeds `primaryFor='avatar'` for pre-M2.5 users)
	 * still work; `syncAvatarToAuth` falls back to that row when no
	 * face-ref exists yet.
	 */
	async setPrimary(id: string, slot: MeImagePrimarySlot | null): Promise<void> {
		if (slot === null) {
			// Clear whatever this row currently holds. If it was the
			// face-ref or the legacy avatar holder, we also need to sync
			// the change out to Better Auth.
			const existing = await meImagesTable.get(id);
			const wasAvatarRelevant =
				existing?.primaryFor === 'face-ref' || existing?.primaryFor === 'avatar';
			const nowIso = new Date().toISOString();
			await meImagesTable.update(id, { primaryFor: null });
			emitDomainEvent('MeImagePrimaryChanged', 'profile', 'meImages', id, {
				meImageId: id,
				slot: null,
			});
			if (wasAvatarRelevant) await syncAvatarToAuth();
			return;
		}

		await setPrimaryInTx(id, slot);
		emitDomainEvent('MeImagePrimaryChanged', 'profile', 'meImages', id, {
			meImageId: id,
			slot,
		});
		if (slot === 'avatar' || slot === 'face-ref') {
			await syncAvatarToAuth();
		}
		// Mirror face-ref / body-ref into mana-me so cross-app
		// consumers (Werdrobe, Memoro, …) get the user's current
		// face/body without depending on the managarten DB. Skipped
		// for the legacy `avatar` slot because `syncAvatarToAuth`
		// already covers it via Better Auth. Best-effort — failures
		// don't roll back the local primary swap.
		if (slot === 'face-ref' || slot === 'body-ref') {
			const row = await meImagesTable.get(id);
			if (row?.mediaId) {
				void syncMeImagePrimaryToPlatform(row.mediaId, slot);
			}
		}
	},

	async deleteMeImage(id: string): Promise<void> {
		const existing = await meImagesTable.get(id);
		const wasAvatarRelevant =
			existing?.primaryFor === 'face-ref' || existing?.primaryFor === 'avatar';
		const nowIso = new Date().toISOString();
		await meImagesTable.update(id, {
			deletedAt: nowIso,
			// Dropping a primary-holder silently leaves the slot empty;
			// the UI's primary-picker will prompt the user to pick a new
			// one next time it renders.
			primaryFor: null,
		});
		emitDomainEvent('MeImageDeleted', 'profile', 'meImages', id, { meImageId: id });
		if (wasAvatarRelevant) await syncAvatarToAuth();
	},
};
