/**
 * Compat-Alias für die v0.1.x-`toastStore`-API.
 *
 * Brücke für managarten + andere ältere Konsumenten, bis sie auf
 * `toasts.info/success/warning/error` aus `./store.svelte` umstellen.
 *
 * **Übergang**: `toastStore.undo(message, callback)` schaltet heute
 * nur einen Info-Toast ohne Rückgängig-Button. Echte Action-Toasts
 * brauchen eine erweiterte ToastStack-API (eigener Sprint, siehe
 * PORTING_PLAN.md).
 */

import { toasts } from './store.svelte';

export const toastStore = {
	info(message: string, options?: { duration?: number }) {
		toasts.info(message, options);
	},
	success(message: string, options?: { duration?: number }) {
		toasts.success(message, options);
	},
	warning(message: string, options?: { duration?: number }) {
		toasts.warning(message, options);
	},
	error(message: string, options?: { duration?: number }) {
		toasts.error(message, options);
	},
	/** Backwards-Compat. v0.1.x hatte einen Undo-Toast mit Rückgängig-Button.
	 *  v1.0.0-Übergang: nur Info-Toast — Callback wird heute NICHT aufgerufen. */
	undo(message: string, _onUndo?: () => void) {
		toasts.info(message);
	},
	/** Manche v0.1.x-Konsumenten haben `toastStore.show?.(msg)` aufgerufen. */
	show(message: string) {
		toasts.info(message);
	},
};
