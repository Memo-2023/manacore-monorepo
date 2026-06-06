/**
 * OIDC-BFF-Server für die Brand-Domain `managarten.com`.
 *
 * Server-only (wird nur von `src/routes/auth/{login,oidc-callback,refresh,
 * logout}/+server.ts` importiert). Macht den Authorization-Code+PKCE-Flow
 * gegen `auth.mana.how` und setzt First-Party-Cookies auf `.managarten.com`
 * — eine Session über alle managarten.com-Subdomains, ohne Third-Party-
 * Cookie. Identisches Muster wie avatar/kollekta/pageta, nur mit
 * `cookieDomain` für die Multi-Subdomain-App (shared-auth-sso ≥ 0.3.0).
 *
 * Der Bestands-Cookie-SSO-Pfad (`auth/callback/+page.svelte`,
 * `session.tryRefresh()` gegen `.mana.how`) bleibt für mana.how
 * unangetastet — diese Routen werden auf mana.how nicht aufgerufen.
 *
 * Voraussetzungen (Server-Env):
 *   - `MANA_WEB_OIDC_CLIENT_SECRET` — Client-Secret (in mana-auth als
 *     `mana-web` registriert, siehe mana/services/mana-auth/src/auth/
 *     oidc-clients.ts).
 *   - `PUBLIC_APP_URL` — kanonische App-Origin (prod `https://managarten.com`,
 *     dev `http://localhost:5173`). Bestimmt die `redirect_uri` (muss exakt
 *     einer registrierten redirectUrl entsprechen).
 */
import { createOidcServer } from '@mana/shared-auth-sso/server';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';

const APP_URL = (pubEnv.PUBLIC_APP_URL ?? 'https://managarten.com').replace(/\/$/, '');
const ISSUER = (pubEnv.PUBLIC_MANA_AUTH_URL_CLIENT ?? 'https://auth.mana.how').replace(/\/$/, '');

export const oidc = createOidcServer({
	clientId: 'mana-web',
	clientSecret: env.MANA_WEB_OIDC_CLIENT_SECRET ?? '',
	issuer: ISSUER,
	redirectUri: `${APP_URL}/auth/oidc-callback`,
	// Multi-Subdomain-Session: ein Cookie für managarten.com + alle Module
	// (chat./todo./…). In dev (localhost) host-only.
	cookieDomain: dev ? undefined : '.managarten.com',
	cookiePrefix: 'mana_mana-web',
});
