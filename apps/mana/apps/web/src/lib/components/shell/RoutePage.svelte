<!--
  RoutePage — auto-metadata wrapper around ModuleShell for sub-route pages.

  Looks up title / icon / color from the app-registry by appId so every
  (app)/{appId}/+page.svelte can stay three lines:

    <RoutePage appId="recipes">
      <ListView />
    </RoutePage>

  For custom titles (sub-views like /picture/generate), custom actions,
  or a back button, the caller can override or use ModuleShell directly.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getApp } from '$lib/app-registry';
	import { ModuleShell } from './index';

	interface Props {
		/** App descriptor id from the registry (matches apps.ts `id:`). */
		appId: string;
		/** Override the registry title (useful for sub-views). */
		title?: string;
		/** Back button target. When set, header shows a back arrow instead of nothing. */
		backHref?: string;
		onBack?: () => void;
		/** Right-side header slot for view-specific controls. */
		actions?: Snippet;
		/** Toolbar slot rendered below the header, above the body. */
		toolbar?: Snippet;
		children: Snippet;
	}

	let {
		appId,
		title: titleOverride,
		backHref,
		onBack,
		actions,
		toolbar,
		children,
	}: Props = $props();

	const app = $derived(getApp(appId));
	const resolvedTitle = $derived(titleOverride ?? app?.name ?? appId);
</script>

<ModuleShell
	variant="fill"
	title={resolvedTitle}
	icon={app?.icon}
	color={app?.color}
	{backHref}
	{onBack}
	{actions}
	{toolbar}
>
	{@render children()}
</ModuleShell>
