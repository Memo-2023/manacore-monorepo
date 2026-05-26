/**
 * Shared security headers for SvelteKit web apps.
 *
 * Sets standard security headers (CSP, X-Frame-Options, etc.)
 * with GlitchTip error tracking pre-configured.
 *
 * @example
 * ```typescript
 * import { setSecurityHeaders } from '@mana/shared-utils/security-headers';
 *
 * const response = await resolve(event, { transformPageChunk: ... });
 * setSecurityHeaders(response, {
 *   connectSrc: [authUrl, backendUrl],
 * });
 * return response;
 * ```
 */

interface SecurityHeadersOptions {
	/** Additional connect-src origins (auth URL, backend URL, etc.) */
	connectSrc?: string[];
	/** Additional script-src origins */
	scriptSrc?: string[];
	/** Additional img-src origins */
	imgSrc?: string[];
	/** Additional font-src origins */
	fontSrc?: string[];
	/** Additional media-src origins (audio/video sources) */
	mediaSrc?: string[];
	/** Override frame-ancestors (default: 'none') */
	frameAncestors?: string;
}

/**
 * Set standard security headers on a Response object.
 * Includes GlitchTip (glitchtip.mana.how) by default.
 */
export function setSecurityHeaders(response: Response, options: SecurityHeadersOptions = {}): void {
	const {
		connectSrc = [],
		scriptSrc = [],
		imgSrc = [],
		fontSrc = [],
		mediaSrc = [],
		frameAncestors = "'none'",
	} = options;

	// Standard security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// Permissions-Policy: allow microphone for `self` so dreams/memoro voice
	// capture (getUserMedia) works on mana.how. `microphone=()` would block
	// the API entirely — Chrome reports `[Violation] Permissions policy
	// violation: microphone is not allowed in this document` and the
	// permission dialog never appears, even if the user has explicitly
	// granted access in OS + browser settings. Camera stays disallowed
	// since no module needs it.
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)');

	// Content Security Policy
	const cspDirectives = [
		"default-src 'self'",
		// 'wasm-unsafe-eval' is required by @mana/local-llm to instantiate
		// browser inference WebGPU runtimes (both the old WebLLM/MLC path
		// and the current transformers.js/ONNX path). It only permits
		// WebAssembly compilation, NOT eval()/new Function() — much narrower
		// than the legacy 'unsafe-eval' source. Supported by all evergreen
		// browsers.
		`script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://glitchtip.mana.how ${scriptSrc.join(' ')}`.trim(),
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' data: blob: https: ${imgSrc.join(' ')}`.trim(),
		`connect-src 'self' https://glitchtip.mana.how ${connectSrc.join(' ')}`.trim(),
		`font-src 'self' ${fontSrc.join(' ')}`.trim(),
		mediaSrc.length > 0 ? `media-src 'self' ${mediaSrc.join(' ')}`.trim() : '',
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		`frame-ancestors ${frameAncestors}`,
	];

	response.headers.set('Content-Security-Policy', cspDirectives.filter(Boolean).join('; '));
}
