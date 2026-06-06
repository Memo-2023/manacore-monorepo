/**
 * OIDC-BFF-Host-Erkennung.
 *
 * Die unified App läuft unter zwei Registrable-Domains (Domain-Umzug
 * 2026-06): `mana.how` (Bestand) und `managarten.com` (Brand). Auf
 * `mana.how` funktioniert die Cookie-SSO über das `.mana.how`-Session-
 * Cookie. Auf `managarten.com` ist dieses Cookie Third-Party (von
 * Browsern blockiert) → dort nutzt die App den OIDC-BFF: First-Party-
 * Cookie auf `.managarten.com`, gesetzt von den App-eigenen
 * `/auth/*`-Server-Routen (siehe `lib/auth/oidc-server.ts`).
 *
 * Diese Funktion ist die EINE Stelle, an der zwischen beiden Auth-Wegen
 * unterschieden wird. Auf `mana.how` ist sie immer `false` → der
 * Bestands-Pfad bleibt byte-identisch.
 */
import { browser } from '$app/environment';

const BFF_APEX = 'managarten.com';
const BFF_SUFFIX = '.managarten.com';

/** True, wenn die aktuelle Origin den OIDC-BFF statt Cookie-SSO nutzt. */
export function isBffHost(): boolean {
	if (!browser || typeof window === 'undefined') return false;
	const h = window.location.hostname;
	return h === BFF_APEX || h.endsWith(BFF_SUFFIX);
}
