/**
 * Client for `POST /api/v1/profile/me-images/upload` — the M1 endpoint
 * that wraps mana-media (CAS dedup + thumbnails) with auth.
 *
 * Returns what the Dexie row needs: mediaId, storagePath, publicUrl,
 * thumbnailUrl. Dimensions are read client-side so the call site can
 * stamp width/height on the LocalMeImage without waiting for
 * mana-media's async processing pass.
 */

import { getManaApiUrl } from '$lib/api/config';
import { authStore } from '$lib/stores/auth.svelte';
import { meImagesStore } from '../stores/me-images.svelte';
import type { MeImage, MeImageKind, MeImagePrimarySlot } from '../types';

export interface UploadMeImageResult {
	mediaId: string;
	storagePath: string;
	publicUrl: string;
	thumbnailUrl?: string;
}

/**
 * Mirror a primary-slot change into the platform's mana-me service.
 * The managarten Dexie row stays authoritative locally; mana-me is the
 * cross-app source for "which photo is the user's current face/body".
 * Best-effort — a failure does not block the user-facing setPrimary.
 *
 * Only fires for `face-ref` and `body-ref`. The legacy `avatar` slot is
 * synced separately via `syncAvatarToAuth` and doesn't need a mana-me
 * mirror.
 */
export async function syncMeImagePrimaryToPlatform(
	mediaId: string,
	slot: 'face-ref' | 'body-ref'
): Promise<void> {
	try {
		const token = await authStore.getValidToken();
		if (!token) return;
		await fetch(`${getManaApiUrl()}/api/v1/profile/me-images/sync-primary`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ mediaId, slot }),
		});
	} catch (err) {
		console.warn('[profile] mana-me primary sync failed', err);
	}
}

export async function uploadMeImageFile(file: File): Promise<UploadMeImageResult> {
	// Fail-fast wenn der Auth-Store keinen Token liefern kann. Vorher
	// schickten wir die Anfrage trotzdem ohne `Authorization`-Header
	// los und der Server antwortete kryptisch mit "Missing authorization
	// header" — der User hatte keinen Hinweis ob's ein Login-Problem
	// oder Server-Down war. Jetzt klarer Diagnose-Pfad.
	const token = await authStore.getValidToken();
	if (!token) {
		throw new Error(
			'Du bist nicht eingeloggt — bitte aktualisiere die Seite und logge dich neu ein, dann erneut hochladen.'
		);
	}

	const formData = new FormData();
	formData.append('file', file);

	const response = await fetch(`${getManaApiUrl()}/api/v1/profile/me-images/upload`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: formData,
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
		// 401 nach getValidToken-Erfolg = Token war serverseitig schon
		// abgelaufen / invalidiert. Nutzer-freundliche Meldung statt
		// Server-String "Missing authorization header".
		if (response.status === 401) {
			throw new Error('Session abgelaufen — bitte aktualisiere die Seite und logge dich neu ein.');
		}
		throw new Error(body.error || `Upload failed (${response.status})`);
	}

	return response.json() as Promise<UploadMeImageResult>;
}

/**
 * Read the natural dimensions of an image file client-side. mana-media
 * also reports dimensions post-processing, but we want them synchronously
 * so the Dexie row lands with `width` and `height` populated on first
 * write — that lets the UI pick the right aspect-ratio tile immediately
 * instead of re-flowing once the server catches up.
 */
export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve(null);
		};
		img.src = url;
	});
}

/**
 * Full ingest pipeline for a single File: read dimensions → upload to the
 * auth-protected endpoint → write a LocalMeImage through the store (which
 * handles encryption + sync) → optionally claim a primary slot.
 *
 * This is the exact sequence `MeImagesView.ingestFiles()` runs for every
 * file it receives. Extracted so in-context upload cards in other modules
 * (wardrobe try-on, picture reference picker) can trigger the same write
 * without duplicating the orchestration.
 *
 * `autoAiReference: true` flips `usage.aiReference=true` on creation —
 * only intended for call-sites where the upload context itself is the
 * consent (e.g. "upload a reference for the picture generator"). The
 * default remains opt-in-per-image, matching the /profile/me-images
 * flow.
 */
export async function ingestMeImageFile(
	file: File,
	options: {
		kind: MeImageKind;
		claimSlot?: MeImagePrimarySlot;
		autoAiReference?: boolean;
	}
): Promise<MeImage> {
	const dims = (await readImageDimensions(file)) ?? { width: 0, height: 0 };
	const uploaded = await uploadMeImageFile(file);
	const created = await meImagesStore.createMeImage({
		kind: options.kind,
		mediaId: uploaded.mediaId,
		storagePath: uploaded.storagePath,
		publicUrl: uploaded.publicUrl,
		thumbnailUrl: uploaded.thumbnailUrl ?? null,
		width: dims.width,
		height: dims.height,
		usage: options.autoAiReference ? { aiReference: true } : undefined,
	});
	if (options.claimSlot) {
		// setPrimary transactionally clears any previous slot-holder, so an
		// old face/body automatically drops into the grid on the profile
		// page without a separate cleanup step.
		await meImagesStore.setPrimary(created.id, options.claimSlot);
	}
	return created;
}
