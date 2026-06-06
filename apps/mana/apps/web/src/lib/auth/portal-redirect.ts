/**
 * Portal-Redirect-Helper.
 *
 * Statt einer eigenen Login-Seite leitet managarten unauthenticated User
 * an `auth.mana.how/login` weiter. Nach erfolgreichem Login landet der
 * User auf `/auth/callback?next=…`, wo der Token via SSO-Cookie geholt
 * und der Encryption-Vault entsperrt wird.
 *
 * Diese Funktion macht einen harten `window.location.href` — keinen
 * SvelteKit-`goto` — weil das Portal eine eigene Origin ist.
 *
 * Resolution-Order für die Portal-URL:
 *   1. `window.__PUBLIC_AUTH_WEB_URL__` (SSR-injected, prod: `https://auth.mana.how`)
 *   2. `process.env.PUBLIC_AUTH_WEB_URL` (SSR)
 *   3. `https://auth.mana.how` (default — auch in localhost ungewöhnlich)
 *
 * Wie bei `auth-fetch.authBaseUrl` lesen wir NICHT direkt
 * `$env/dynamic/public` — die Build-Time-Env in Production wäre evtl.
 * eine Docker-interne URL.
 */

import { browser } from '$app/environment';
import { isBffHost } from '$lib/auth/bff';

const FALLBACK_PORTAL = 'https://auth.mana.how';
const APP_ID = 'mana';

/**
 * BFF-Login-URL auf der eigenen Origin (managarten.com). Startet den
 * OIDC-Code-Flow über `/auth/login` statt des Portal-Redirects — der
 * Browser bleibt auf der eigenen Domain, das Cookie ist First-Party.
 */
function bffLoginUrl(next: string): string {
	const url = new URL('/auth/login', window.location.origin);
	if (next.startsWith('/')) url.searchParams.set('next', next);
	return url.toString();
}

function portalUrl(): string {
	if (browser && typeof window !== 'undefined') {
		const injected = (window as unknown as { __PUBLIC_AUTH_WEB_URL__?: string })
			.__PUBLIC_AUTH_WEB_URL__;
		return (injected || FALLBACK_PORTAL).replace(/\/$/, '');
	}
	const fromEnv =
		(typeof process !== 'undefined' && process.env?.PUBLIC_AUTH_WEB_URL) || FALLBACK_PORTAL;
	return fromEnv.replace(/\/$/, '');
}

function appOrigin(): string {
	if (typeof window === 'undefined') return 'https://mana.how';
	return window.location.origin;
}

/** Baut die `/auth/callback?next=<path>`-URL für die aktuelle App. */
function callbackUrl(next: string | null | undefined): string {
	const base = appOrigin();
	const nextParam = next && next.startsWith('/') ? `?next=${encodeURIComponent(next)}` : '';
	return `${base}/auth/callback${nextParam}`;
}

export interface RedirectToPortalOptions {
	/**
	 * Pfad innerhalb der App, zu dem der User nach Login zurückgeführt
	 * werden soll. Default: der aktuelle `window.location.pathname`.
	 * Pfade ohne führenden `/` werden ignoriert.
	 */
	next?: string;
	/** Welche Portal-Page direkt öffnen — login (default) oder register. */
	target?: 'login' | 'register';
}

/** Hartes Redirect zum Auth-Portal. */
export function redirectToPortal(options: RedirectToPortalOptions = {}): void {
	if (typeof window === 'undefined') return;
	const target = options.target ?? 'login';
	const next = options.next ?? window.location.pathname + window.location.search;
	// managarten.com: über die eigene BFF-Login-Route (login + register
	// laufen beide über die Portal-UI hinter /auth/login).
	if (isBffHost()) {
		window.location.href = bffLoginUrl(next);
		return;
	}
	const url = new URL(`${portalUrl()}/${target}`);
	url.searchParams.set('app', APP_ID);
	url.searchParams.set('redirect', callbackUrl(next));
	window.location.href = url.toString();
}

/**
 * Liefert die Portal-URL als String (z.B. für `<a href>` in
 * server-rendered Content). Vorsicht: Bei Klick erfolgt ein voller
 * Navigation-Refresh (App-Bundle wird neu geladen).
 */
export function portalHref(options: RedirectToPortalOptions = {}): string {
	const target = options.target ?? 'login';
	const next = options.next ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
	if (isBffHost()) return bffLoginUrl(next);
	const url = new URL(`${portalUrl()}/${target}`);
	url.searchParams.set('app', APP_ID);
	url.searchParams.set('redirect', callbackUrl(next));
	return url.toString();
}
