<script lang="ts">
	import type { Snippet } from 'svelte';
	import Modal from './Modal.svelte';
	import Button from '../atoms/Button.svelte';

	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		open?: boolean;
		/** v0.1.x-Compat-Alias für `open`. */
		visible?: boolean;
		title: string;
		description?: string;
		size?: Size;
		submitLabel?: string;
		cancelLabel?: string;
		submitting?: boolean;
		canSubmit?: boolean;
		onSubmit: (e: SubmitEvent) => void;
		onCancel?: () => void;
		ariaLabel?: string;
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		visible,
		title,
		description,
		size = 'md',
		submitLabel = 'Speichern',
		cancelLabel = 'Abbrechen',
		submitting = false,
		canSubmit = true,
		onSubmit,
		onCancel,
		ariaLabel,
		children,
	}: Props = $props();

	let formRef: HTMLFormElement | null = $state(null);

	function handleClose() {
		open = false;
		onCancel?.();
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit || submitting) return;
		onSubmit(e);
	}

	function handleSubmitClick() {
		formRef?.requestSubmit();
	}
</script>

<Modal open={visible ?? open} {title} {description} {size} {ariaLabel} onClose={handleClose}>
	{#snippet children()}
		<form bind:this={formRef} onsubmit={handleSubmit} class="form">
			{#if children}{@render children()}{/if}
		</form>
	{/snippet}
	{#snippet footer()}
		<Button variant="ghost" size="sm" onclick={handleClose} disabled={submitting}>
			{cancelLabel}
		</Button>
		<Button
			variant="primary"
			size="sm"
			loading={submitting}
			disabled={!canSubmit}
			onclick={handleSubmitClick}
		>
			{submitLabel}
		</Button>
	{/snippet}
</Modal>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
