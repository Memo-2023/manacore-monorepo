import { z } from 'zod';

/**
 * Analytics block — injects a tracking snippet into the published
 * page. Opt-in, no cookies by design (Plausible is cookieless).
 *
 * The block renders nothing visible in edit/preview; in public mode
 * it emits a single <script> tag. No PII collection (no visitor IDs,
 * no fingerprinting), no admin UI access required.
 */
export const AnalyticsSchema = z.object({
	provider: z.enum(['plausible']).default('plausible'),
	/** Plausible: the domain property. */
	siteKey: z.string().max(128).default(''),
	/**
	 * Optional script-host override for self-hosted instances. Leave
	 * empty for the default provider CDN. Validated as full https URL.
	 */
	scriptUrl: z.string().max(512).default(''),
});

export type AnalyticsProps = z.infer<typeof AnalyticsSchema>;

export const ANALYTICS_DEFAULTS: AnalyticsProps = {
	provider: 'plausible',
	siteKey: '',
	scriptUrl: '',
};
