// OIDC-BFF Login-Start (nur managarten.com). Setzt PKCE/State-Cookies und
// leitet zur auth.mana.how-Authorize-Seite. Auf mana.how nicht aufgerufen.
import { oidc } from '$lib/auth/oidc-server';

export const GET = oidc.login;
