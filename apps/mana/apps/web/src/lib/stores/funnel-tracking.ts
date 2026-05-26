/**
 * Funnel Tracking — fires one-time activation & retention events.
 *
 * Each event uses a localStorage flag so it fires at most once per user/device.
 * Analytics-Versand ist entfernt (2026-05-26) — die ManaEvents-Aufrufe
 * sind No-ops; Flags/Stufen bleiben für evtl. künftige lokale Auswertung:
 *   signup → onboarding_completed → first_content_created → second_module_used → user_return_visit
 */

import { ManaEvents } from '@mana/shared-utils/analytics';

const KEYS = {
	firstContent: 'mana_funnel_first_content',
	returnVisit: 'mana_funnel_return_visit',
	modulesUsed: 'mana_funnel_modules',
	wasGuest: 'mana_funnel_was_guest',
} as const;

function flagged(key: string): boolean {
	return localStorage.getItem(key) === '1';
}

function flag(key: string): void {
	localStorage.setItem(key, '1');
}

/**
 * Call on app init (authenticated users).
 * Fires `user_return_visit` on the second session.
 */
export function trackReturnVisit(): void {
	if (flagged(KEYS.returnVisit)) return;

	const lastVisit = localStorage.getItem('mana_last_visit');
	const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	if (lastVisit && lastVisit !== now) {
		ManaEvents.userReturnVisit();
		flag(KEYS.returnVisit);
	}

	localStorage.setItem('mana_last_visit', now);
}

/**
 * Call when a user creates content in any module.
 * Fires `first_content_created` exactly once.
 */
export function trackFirstContent(appId: string): void {
	if (flagged(KEYS.firstContent)) return;
	ManaEvents.firstContentCreated(appId);
	flag(KEYS.firstContent);
}

/**
 * Call when a user navigates to a module.
 * Fires `second_module_used` when they visit a second distinct module.
 */
export function trackModuleUsed(appId: string): void {
	const raw = localStorage.getItem(KEYS.modulesUsed);
	const modules: string[] = raw ? JSON.parse(raw) : [];

	if (modules.includes(appId)) return;
	modules.push(appId);
	localStorage.setItem(KEYS.modulesUsed, JSON.stringify(modules));

	if (modules.length === 2) {
		ManaEvents.secondModuleUsed(appId);
	}
}

/**
 * Mark the current session as guest (call before auth).
 */
export function markAsGuest(): void {
	if (!flagged(KEYS.wasGuest)) {
		flag(KEYS.wasGuest);
	}
}

/**
 * Call after signup. Fires `guest_converted` if the user was previously a guest.
 */
export function trackGuestConversion(): void {
	if (flagged(KEYS.wasGuest)) {
		ManaEvents.guestConverted();
		localStorage.removeItem(KEYS.wasGuest);
	}
}
