/**
 * Web Vitals tracking
 *
 * Misst Core Web Vitals (LCP, CLS, INP) + FCP/TTFB und reicht sie an die
 * `trackEvent`-API weiter. Hinweis: Web-Analytics-Versand ist entfernt
 * (2026-05-26) → die Werte gehen aktuell in einen No-op.
 * Call `trackWebVitals()` once on app startup.
 *
 * @example
 * ```typescript
 * import { trackWebVitals } from '@mana/shared-utils/web-vitals';
 * trackWebVitals();
 * ```
 */

import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { trackEvent } from './analytics';

/**
 * Rating thresholds per metric (good / needs-improvement / poor).
 * Based on https://web.dev/articles/vitals
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
	const thresholds: Record<string, [number, number]> = {
		CLS: [0.1, 0.25],
		INP: [200, 500],
		LCP: [2500, 4000],
		FCP: [1800, 3000],
		TTFB: [800, 1800],
	};
	const [good, poor] = thresholds[name] ?? [Infinity, Infinity];
	if (value <= good) return 'good';
	if (value <= poor) return 'needs-improvement';
	return 'poor';
}

function reportMetric(name: string, value: number): void {
	const rounded = name === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value);
	trackEvent('web_vital', {
		metric: name,
		value: rounded,
		rating: getRating(name, value),
		module: 'performance',
	});
}

/**
 * Start tracking all Core Web Vitals + FCP/TTFB.
 * Each metric fires once per page load when the browser has a final value.
 */
export function trackWebVitals(): void {
	if (typeof window === 'undefined') return;

	onCLS((m) => reportMetric('CLS', m.value));
	onINP((m) => reportMetric('INP', m.value));
	onLCP((m) => reportMetric('LCP', m.value));
	onFCP((m) => reportMetric('FCP', m.value));
	onTTFB((m) => reportMetric('TTFB', m.value));
}
