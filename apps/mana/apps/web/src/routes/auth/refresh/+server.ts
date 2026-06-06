// OIDC-BFF Refresh (nur managarten.com). Same-origin POST aus
// session.tryRefresh() — liest das HttpOnly-Refresh-Cookie und liefert
// `{ accessToken }` (gleiche Shape wie der mana-auth-Refresh).
import { oidc } from '$lib/auth/oidc-server';

export const POST = oidc.refresh;
