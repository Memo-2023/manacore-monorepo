<script lang="ts">
	import type { Snippet } from 'svelte';

	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		open?: boolean;
		/** v0.1.x-Compat-Alias für `open`. */
		visible?: boolean;
		onClose?: () => void;
		title?: string;
		description?: string;
		size?: Size;
		/** v0.1.x-Compat-Alias für `size`. */
		maxWidth?: Size;
		closeOnBackdrop?: boolean;
		ariaLabel?: string;
		children?: Snippet;
		footer?: Snippet;
		/** v0.1.x-Compat: Custom-Class. */
		class?: string;
	}

	let {
		open = $bindable(false),
		visible,
		onClose,
		title,
		description,
		size = 'md',
		maxWidth,
		closeOnBackdrop = true,
		ariaLabel,
		children,
		footer,
	}: Props = $props();

	let dialog: HTMLDialogElement | null = $state(null);

	const effectiveOpen = $derived(visible ?? open);
	const effectiveSize = $derived(maxWidth ?? size);

	$effect(() => {
		if (!dialog) return;
		if (effectiveOpen && !dialog.open) {
			dialog.showModal();
		} else if (!effectiveOpen && dialog.open) {
			dialog.close();
		}
	});

	function handleClose() {
		open = false;
		onClose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (!closeOnBackdrop) return;
		// click on the dialog itself (backdrop area) — content is wrapped in <div class="content">
		if (e.target === dialog) handleClose();
	}

	function handleCancel(e: Event) {
		// fires on Escape — let it bubble to native close, then sync state
		e.preventDefault();
		handleClose();
	}
</script>

<dialog
	bind:this={dialog}
	class="modal size-{effectiveSize}"
	aria-label={ariaLabel ?? title}
	aria-describedby={description ? 'modal-desc' : undefined}
	onclick={handleBackdropClick}
	oncancel={handleCancel}
>
	<div class="content" role="document">
		{#if title || description}
			<header class="head">
				{#if title}<h2 class="title">{title}</h2>{/if}
				{#if description}<p class="desc" id="modal-desc">{description}</p>{/if}
			</header>
		{/if}
		<div class="body">
			{#if children}{@render children()}{/if}
		</div>
		{#if footer}
			<footer class="foot">{@render footer()}</footer>
		{/if}
	</div>
</dialog>

<style>
	.modal {
		padding: 0;
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.875rem;
		background: hsl(var(--color-surface));
		color: hsl(var(--color-foreground));
		font-family: inherit;
		max-height: 90vh;
		max-width: 95vw;
		box-shadow:
			0 8px 24px hsl(var(--color-foreground) / 0.12),
			0 2px 6px hsl(var(--color-foreground) / 0.06);
	}

	.size-sm {
		width: 26rem;
	}
	.size-md {
		width: 36rem;
	}
	.size-lg {
		width: 52rem;
	}

	.modal::backdrop {
		background: hsl(var(--color-foreground) / 0.4);
		backdrop-filter: blur(2px);
	}

	.content {
		display: flex;
		flex-direction: column;
		max-height: 90vh;
	}

	.head {
		padding: 1.25rem 1.25rem 0.75rem;
		border-bottom: 1px solid hsl(var(--color-border));
	}

	.title {
		margin: 0 0 0.25rem;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.desc {
		margin: 0;
		font-size: 0.875rem;
		color: hsl(var(--color-muted-foreground));
	}

	.body {
		padding: 1.25rem;
		overflow-y: auto;
		flex: 1;
	}

	.foot {
		padding: 0.875rem 1.25rem;
		border-top: 1px solid hsl(var(--color-border));
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.modal::backdrop {
			backdrop-filter: none;
		}
	}
</style>
