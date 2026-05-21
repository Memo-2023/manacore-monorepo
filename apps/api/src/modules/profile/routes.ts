/**
 * Profile module — server endpoints.
 *
 * Upload route for me-images (docs/plans/me-images-and-reference-generation.md M1).
 * Thin wrapper over mana-media — the stored row lands in Dexie on the
 * client after this returns. We keep server-side storage of the image
 * in mana-media (CAS + thumbnails) so the Picture generator can pull
 * the original bytes by `mediaId` for the eventual /v1/images/edits
 * call (M3) without the client needing to re-upload each time.
 *
 * `POST /me-images/sync-primary` mirrors a primary-slot change into
 * mana-me so cross-app consumers (Werdrobe, Memoro, …) get a
 * managarten-DB-independent source for the user's current face/body.
 * See `mana/docs/USER_CONTEXT_STRATEGY.md` for the rationale.
 */

import { Hono } from 'hono';
import type { AuthVariables } from '@mana/shared-hono';
import { z } from 'zod';
import { mirrorMeImageToManaMe, slotToManaMeKind } from '../../lib/mana-me';

const routes = new Hono<{ Variables: AuthVariables }>();

// Max upload size for me-images. 10MB matches /picture/upload — same
// real-world phone-camera PNG range, same mana-media pipeline downstream.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const syncPrimarySchema = z.object({
	mediaId: z.string().min(1),
	slot: z.enum(['face-ref', 'body-ref']),
});

routes.post('/me-images/upload', async (c) => {
	const userId = c.get('userId');
	const formData = await c.req.formData();
	const file = formData.get('file') as File | null;

	if (!file) return c.json({ error: 'No file' }, 400);
	if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: 'Max 10MB' }, 400);

	try {
		const { uploadImageToMedia } = await import('../../lib/media');
		const buffer = await file.arrayBuffer();
		// `app='me'` tags the media_references row so a later
		// GET /api/v1/media?app=me&userId=X can list all me-images,
		// and the /v1/images/edits path can verify ownership in O(1).
		const result = await uploadImageToMedia(buffer, file.name, {
			app: 'me',
			userId,
		});

		return c.json(
			{
				mediaId: result.id,
				storagePath: result.id,
				publicUrl: result.urls.original,
				thumbnailUrl: result.urls.thumbnail,
			},
			201
		);
	} catch (_err) {
		return c.json({ error: 'Upload failed' }, 500);
	}
});

/**
 * Mirror a primary-slot change into mana-me. Client calls this whenever
 * the managarten Dexie store flips `primaryFor='face-ref' | 'body-ref'`
 * onto a different image. Best-effort — failures don't block the
 * user-facing write (managarten Dexie remains authoritative locally).
 *
 * The mana-me side does its own mana-media ownership check on the
 * mediaId, but we additionally validate here that the caller's userId
 * matches the JWT — the X-Service-Key path on mana-me trusts us as a
 * platform service, so this is the gate that ties it back to the user.
 */
routes.post('/me-images/sync-primary', async (c) => {
	const userId = c.get('userId');
	const body = await c.req.json().catch(() => ({}));
	const parsed = syncPrimarySchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'invalid_body', detail: parsed.error.flatten() }, 400);
	}
	const kind = slotToManaMeKind(parsed.data.slot);
	if (!kind) return c.json({ error: 'unsupported_slot' }, 400);

	const ok = await mirrorMeImageToManaMe({
		userId,
		mediaId: parsed.data.mediaId,
		kind,
		makePrimary: true,
	});
	return c.json({ mirrored: ok });
});

export { routes as profileRoutes };
