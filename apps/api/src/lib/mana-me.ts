/**
 * Service-to-service client for mana-me.
 *
 * managarten's Dexie-local-first me-images module stays the user's
 * curated, encrypted, per-space collection (with `aiReference`-opt-in
 * etc.) — but when the user sets the primary slot for face-ref /
 * body-ref, that decision is the *platform-truth* every other app
 * needs ("which photo is currently this user's face"). This client
 * mirrors that single bit into mana-me via its internal write-through
 * endpoint, so consumers like Werdrobe and Memoro don't depend on the
 * managarten DB.
 *
 * Best-effort: mana-me being unreachable does not fail the user-facing
 * write. The managarten row stays authoritative locally; the next
 * primary-change reconciles. We log + return false instead of throwing.
 */

const MANA_ME_URL = process.env.MANA_ME_URL || 'http://localhost:3078';
const MANA_SERVICE_KEY = process.env.MANA_SERVICE_KEY || 'dev-service-key';

export type ManaMeKind = 'face' | 'fullbody' | 'halfbody' | 'hands' | 'reference';

/**
 * Map managarten's `primaryFor` slot to mana-me's `kind`. We only
 * mirror the two slots that have cross-app meaning — `avatar` is
 * already handled by the existing auth.users.image sync hook in
 * `me-images.svelte.ts` and doesn't need a mana-me entry.
 */
export function slotToManaMeKind(slot: 'avatar' | 'face-ref' | 'body-ref'): ManaMeKind | null {
	if (slot === 'face-ref') return 'face';
	if (slot === 'body-ref') return 'fullbody';
	return null;
}

export interface MeImageWriteThrough {
	userId: string;
	kind: ManaMeKind;
	mediaId: string;
	makePrimary: boolean;
}

export async function mirrorMeImageToManaMe(input: MeImageWriteThrough): Promise<boolean> {
	const url = `${MANA_ME_URL}/api/v1/internal/me/${encodeURIComponent(input.userId)}/images`;
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Service-Key': MANA_SERVICE_KEY,
			},
			body: JSON.stringify({
				kind: input.kind,
				mediaId: input.mediaId,
				makePrimary: input.makePrimary,
			}),
		});
		if (!res.ok) {
			console.warn(
				`[mana-me] mirror failed for user=${input.userId} kind=${input.kind}: ${res.status}`
			);
			return false;
		}
		return true;
	} catch (err) {
		console.warn(`[mana-me] mirror network error for user=${input.userId}:`, err);
		return false;
	}
}
