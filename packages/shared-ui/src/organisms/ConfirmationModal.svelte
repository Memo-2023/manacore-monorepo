<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from '../atoms/Button.svelte';

	interface Props {
		open?: boolean;
		/** v0.1.x-Compat-Alias für `open`. */
		visible?: boolean;
		title: string;
		description?: string;
		/** v0.1.x-Compat-Alias für `description`. */
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		onConfirm: () => void;
		onCancel?: () => void;
		/** v0.1.x-Compat: Alias für onCancel. */
		onClose?: () => void;
		ariaLabel?: string;
	}

	let {
		open = $bindable(false),
		visible,
		title,
		description,
		message,
		confirmLabel = 'Bestätigen',
		cancelLabel = 'Abbrechen',
		destructive = false,
		onConfirm,
		onCancel,
		onClose,
		ariaLabel,
	}: Props = $props();

	const effectiveCancel = $derived(onCancel ?? onClose);

	const effectiveOpen = $derived(visible ?? open);
	const effectiveDescription = $derived(description ?? message);

	function handleClose() {
		open = false;
		effectiveCancel?.();
	}

	function handleConfirm() {
		open = false;
		onConfirm();
	}
</script>

<Modal
	open={effectiveOpen}
	{title}
	description={effectiveDescription}
	size="sm"
	{ariaLabel}
	onClose={handleClose}
>
	{#snippet footer()}
		<Button variant="ghost" size="sm" onclick={handleClose}>{cancelLabel}</Button>
		<Button variant={destructive ? 'danger' : 'primary'} size="sm" onclick={handleConfirm}>
			{confirmLabel}
		</Button>
	{/snippet}
</Modal>
