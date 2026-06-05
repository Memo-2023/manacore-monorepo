import type { LastCategory } from '../types';

/**
 * One inference candidate produced by a source-scanner. The store turns
 * each accepted candidate into a `suspected` last with `inferredFrom` set.
 */
export interface InferenceCandidate {
	refTable: string; // e.g. 'places'
	refId: string;
	title: string; // suggested last title
	category: LastCategory;
	frequencyHint: string; // human-readable "3x/week → 0 in 18mo"
	suggestedDate: string | null; // best guess at when it last happened (ISO date)
}

/**
 * Source-scanner contract. Each scanner inspects its own module's data
 * and returns candidate lasts. Scanners are pure-ish: they read but
 * never write.
 */
export interface InferenceSource {
	id: string; // 'places' | 'contacts' | …
	scan: (now: Date) => Promise<InferenceCandidate[]>;
}

/**
 * Conservative thresholds shared across all sources. Inbox noise is the
 * primary failure mode for this module, so defaults are deliberately
 * tight.
 */
export const INFERENCE_DEFAULTS = {
	/** Minimum prior occurrences to even consider this as a "habit". */
	MIN_PRIOR_OCCURRENCES: 5,
	/** Minimum span of prior activity (days) — guards against short bursts. */
	MIN_PRIOR_SPAN_DAYS: 180,
	/** Required silence (days) since last occurrence before suggesting. */
	MIN_SILENCE_DAYS: 365,
	/** Per-source cap to avoid flooding the Inbox. */
	MAX_CANDIDATES_PER_SOURCE: 3,
	/** Cooldown duration after dismiss (days) — re-suggest only if still silent past this. */
	COOLDOWN_DAYS: 365,
} as const;
