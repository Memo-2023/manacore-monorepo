<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { gameStore } from '$lib/data/local-store';
	import { getAllWorlds, createWorld, deleteWorld } from '$lib/data/world-loader';
	import { WORLD_TEMPLATES } from '$lib/data/templates';
	import type { LocalWorld } from '$lib/data/local-store';

	let worlds = $state<LocalWorld[]>([]);
	let showNewDialog = $state(false);
	let newWorldName = $state('My World');
	let selectedTemplate = $state('village');
	let loading = $state(true);

	onMount(async () => {
		await gameStore.initialize();
		worlds = await getAllWorlds();
		loading = false;
	});

	async function handleCreate() {
		const template = WORLD_TEMPLATES.find((t) => t.id === selectedTemplate);
		if (!template) return;

		const generated = template.generate();
		const worldId = await createWorld(newWorldName, selectedTemplate, generated.areas);

		showNewDialog = false;
		goto(resolve(`/?world=${worldId}`));
	}

	async function handleDelete(worldId: string) {
		await deleteWorld(worldId);
		worlds = await getAllWorlds();
	}

	function handlePlay(worldId: string) {
		goto(resolve(`/?world=${worldId}`));
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-950 text-white">
	<!-- Header -->
	<header class="flex items-center justify-between border-b border-gray-800 px-6 py-4">
		<div class="flex items-center gap-3">
			<h1 class="text-xl font-bold text-emerald-400">ManaVoxel</h1>
			<span class="text-sm text-gray-500">My Worlds</span>
		</div>
		<button
			class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
			onclick={() => (showNewDialog = true)}
		>
			+ New World
		</button>
	</header>

	<!-- Content -->
	<main class="flex-1 p-6">
		{#if loading}
			<div class="py-20 text-center text-gray-500">Loading...</div>
		{:else if worlds.length === 0}
			<div class="py-20 text-center">
				<div class="mb-4 text-4xl">🌍</div>
				<div class="mb-2 text-lg text-gray-400">No worlds yet</div>
				<div class="mb-6 text-sm text-gray-600">Create your first world to start building!</div>
				<button
					class="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
					onclick={() => (showNewDialog = true)}
				>
					Create World
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each worlds as world}
					<div
						class="group rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700"
					>
						<div class="mb-3 flex items-center justify-between">
							<h3 class="font-medium">{world.name}</h3>
							<span
								class="rounded-full px-2 py-0.5 text-[10px] {world.isPublished
									? 'bg-emerald-900 text-emerald-400'
									: 'bg-gray-800 text-gray-500'}"
							>
								{world.isPublished ? 'Published' : 'Draft'}
							</span>
						</div>
						<div class="mb-3 text-xs text-gray-500">
							{world.template} | {world.playCount} plays
						</div>
						{#if world.description}
							<p class="mb-3 text-xs text-gray-600">{world.description}</p>
						{/if}
						<div class="flex gap-2">
							<button
								class="flex-1 rounded-lg bg-emerald-600 py-1.5 text-sm text-white hover:bg-emerald-500"
								onclick={() => handlePlay(world.id)}
							>
								Play
							</button>
							<button
								class="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-red-400"
								onclick={() => handleDelete(world.id)}
							>
								Del
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- New World Dialog -->
{#if showNewDialog}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
		onclick={(e) => {
			if (e.target === e.currentTarget) showNewDialog = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') showNewDialog = false;
		}}
		role="dialog"
		tabindex="-1"
	>
		<div class="w-full max-w-lg rounded-xl bg-gray-900 p-6 shadow-2xl">
			<h2 class="mb-4 text-lg font-bold text-white">New World</h2>

			<!-- Name -->
			<div class="mb-4">
				<label class="block text-sm text-gray-400">
					World Name
					<input
						type="text"
						bind:value={newWorldName}
						class="mt-1 w-full rounded-lg bg-gray-800 px-3 py-2 text-white outline-none focus:ring-1 focus:ring-emerald-500"
						placeholder="My World"
					/>
				</label>
			</div>

			<!-- Template Selection -->
			<div class="mb-6">
				<span class="mb-2 block text-sm text-gray-400">Template</span>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each WORLD_TEMPLATES as template}
						<button
							class="rounded-lg border-2 p-3 text-left transition {selectedTemplate === template.id
								? 'border-emerald-500 bg-emerald-950/50'
								: 'border-gray-700 bg-gray-800 hover:border-gray-600'}"
							onclick={() => (selectedTemplate = template.id)}
						>
							<div class="mb-1 text-xl">{template.icon}</div>
							<div class="text-sm font-medium text-white">{template.name}</div>
							<div class="text-[10px] text-gray-500">{template.description}</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2">
				<button
					class="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 hover:bg-gray-700"
					onclick={() => (showNewDialog = false)}
				>
					Cancel
				</button>
				<button
					class="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500"
					onclick={handleCreate}
				>
					Create
				</button>
			</div>
		</div>
	</div>
{/if}
