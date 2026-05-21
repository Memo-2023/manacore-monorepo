export { default as ToastStack } from './ToastStack.svelte';
export { toasts } from './store.svelte';
export type { Toast, ToastKind, ToastOptions } from './store.svelte';
export { toastStore } from './legacy-store';
// v0.1.x-Alias für `toasts` (Singular-Schreibweise war früher üblich)
export { toasts as toast } from './store.svelte';
