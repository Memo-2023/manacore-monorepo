/**
 * Toast-Store — Svelte-5-Runes-Pattern.
 *
 * Single Module-State, mutationen reaktiv beobachtbar. Konsumenten
 * importieren `toasts` und rufen `toasts.info(...)`/`success(...)` etc.
 * Die `<ToastStack />`-Komponente rendert die aktuellen Items.
 *
 *   import { toasts } from '@mana/shared-ui-2/toast';
 *   toasts.success('Gespeichert.');
 *   toasts.error('Konnte nicht laden.', { duration: 8000 });
 */

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
	id: string;
	kind: ToastKind;
	message: string;
	expiresAt: number;
}

export interface ToastOptions {
	duration?: number;
}

class ToastStore {
	items = $state<Toast[]>([]);
	private nextId = 1;

	push(kind: ToastKind, message: string, options: ToastOptions = {}): string {
		const id = `toast-${this.nextId++}`;
		const duration = options.duration ?? defaultDurationFor(kind);
		const toast: Toast = {
			id,
			kind,
			message,
			expiresAt: Date.now() + duration,
		};
		this.items = [...this.items, toast];
		if (duration > 0) {
			setTimeout(() => this.dismiss(id), duration);
		}
		return id;
	}

	dismiss(id: string): void {
		this.items = this.items.filter((t) => t.id !== id);
	}

	clear(): void {
		this.items = [];
	}

	info(message: string, options?: ToastOptions): string {
		return this.push('info', message, options);
	}
	success(message: string, options?: ToastOptions): string {
		return this.push('success', message, options);
	}
	warning(message: string, options?: ToastOptions): string {
		return this.push('warning', message, options);
	}
	error(message: string, options?: ToastOptions): string {
		return this.push('error', message, options);
	}
}

function defaultDurationFor(kind: ToastKind): number {
	// Errors brauchen länger zum Lesen, Info verschwindet schneller
	switch (kind) {
		case 'error':
			return 8000;
		case 'warning':
			return 6000;
		case 'success':
			return 4000;
		default:
			return 4000;
	}
}

/** Module-Singleton. */
export const toasts = new ToastStore();
