// OIDC-BFF Callback (nur managarten.com). Tauscht den Code gegen Tokens,
// setzt First-Party-Cookies auf .managarten.com, redirected zu `next`.
// Eigener Pfad (nicht /auth/callback), weil dort der Bestands-Cookie-SSO-
// Handler als +page.svelte lebt (mana.how).
import { oidc } from '$lib/auth/oidc-server';

export const GET = oidc.callback;
