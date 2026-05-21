<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ToastStack from './ToastStack.svelte';
	import { toasts } from './store.svelte';
	import Button from '../atoms/Button.svelte';

	const { Story } = defineMeta({
		title: 'Toast/ToastStack',
		component: ToastStack,
		tags: ['autodocs'],
	});

	function info() {
		toasts.info('Sync läuft im Hintergrund.');
	}
	function success() {
		toasts.success('Karte gespeichert.');
	}
	function warning() {
		toasts.warning('Verbindung schwach — manche Aktionen verzögert.');
	}
	function error() {
		toasts.error('Fehler beim Speichern. Bitte erneut versuchen.', { duration: 8000 });
	}
	function clearAll() {
		toasts.clear();
	}
</script>

<Story name="BottomRight">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.5rem;">
			<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
				<Button variant="secondary" size="sm" onclick={info}>Info</Button>
				<Button variant="primary" size="sm" onclick={success}>Success</Button>
				<Button variant="secondary" size="sm" onclick={warning}>Warning</Button>
				<Button variant="danger" size="sm" onclick={error}>Error</Button>
				<Button variant="ghost" size="sm" onclick={clearAll}>Alle löschen</Button>
			</div>
			<p style="font-size:0.8125rem; color:hsl(var(--color-muted-foreground)); margin:0;">
				Toasts erscheinen rechts unten. Auto-dismiss nach 4–8s je Kind.
			</p>
			<ToastStack position="bottom-right" />
		</div>
	{/snippet}
</Story>

<Story name="TopCenter">
	{#snippet children()}
		<div style="display:flex; flex-direction:column; gap:0.5rem;">
			<div style="display:flex; gap:0.5rem;">
				<Button variant="primary" size="sm" onclick={success}>Success-Toast</Button>
				<Button variant="ghost" size="sm" onclick={clearAll}>Löschen</Button>
			</div>
			<p style="font-size:0.8125rem; color:hsl(var(--color-muted-foreground)); margin:0;">
				Position: oben mittig.
			</p>
			<ToastStack position="top-center" />
		</div>
	{/snippet}
</Story>
