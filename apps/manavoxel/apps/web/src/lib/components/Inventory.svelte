<script lang="ts">
	import { type GameItem, MAX_INVENTORY_SLOTS } from '$lib/engine/inventory.svelte';

	const {
		inventory,
		onDrop = undefined as ((slot: number) => void) | undefined,
		onInspect = undefined as ((item: GameItem) => void) | undefined,
	} = $props();

	function drawSprite(canvas: HTMLCanvasElement, item: GameItem) {
		const ctx = canvas.getContext('2d')!;
		const { pixels, width: w, height: h } = item.sprite;
		const scale = Math.min(32 / w, 32 / h);
		ctx.clearRect(0, 0, 32, 32);

		const offsetX = Math.floor((32 - w * scale) / 2);
		const offsetY = Math.floor((32 - h * scale) / 2);

		// Always draw first frame in inventory
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const i = (y * w + x) * 4;
				const a = pixels[i + 3];
				if (a === 0) continue;
				ctx.fillStyle = `rgba(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${a / 255})`;
				ctx.fillRect(offsetX + x * scale, offsetY + y * scale, Math.ceil(scale), Math.ceil(scale));
			}
		}
	}

	// Svelte action: render item into canvas on mount/update
	function itemCanvas(node: HTMLCanvasElement, item: GameItem) {
		drawSprite(node, item);
		return {
			update(newItem: GameItem) {
				drawSprite(node, newItem);
			},
		};
	}

	const rarityBorder: Record<string, string> = {
		common: 'border-gray-600',
		uncommon: 'border-green-500',
		rare: 'border-blue-500',
		epic: 'border-purple-500',
		legendary: 'border-yellow-500',
	};

	function durabilityColor(ratio: number): string {
		if (ratio > 0.6) return '#22c55e'; // green
		if (ratio > 0.3) return '#eab308'; // yellow
		return '#ef4444'; // red
	}
</script>

<div class="flex gap-1 rounded-lg bg-gray-800/90 p-1.5 backdrop-blur">
	{#each Array.from({ length: MAX_INVENTORY_SLOTS }, (_, idx) => idx) as i (i)}
		{@const item = inventory.slots[i]}
		{@const isHeld = inventory.heldSlot === i}
		<button
			class="relative h-10 w-10 rounded border-2 transition-all {isHeld
				? 'scale-110 border-emerald-400 bg-emerald-900/50'
				: item
					? `${rarityBorder[item.rarity] ?? 'border-gray-600'} bg-gray-900 hover:bg-gray-800`
					: 'border-gray-700/50 bg-gray-900/30'}"
			onclick={() => inventory.selectSlot(i)}
			ondblclick={() => {
				if (item) onInspect?.(item);
			}}
			oncontextmenu={(e) => {
				e.preventDefault();
				if (item) onDrop?.(i);
			}}
			title={item ? `${item.name} (${item.rarity}) - Right-click to drop` : `Slot ${i + 1}`}
		>
			{#if item}
				<canvas
					width={32}
					height={32}
					class="h-full w-full"
					style:image-rendering="pixelated"
					use:itemCanvas={item}
				></canvas>
				{@const ratio = item.properties.durabilityCurrent / item.properties.durabilityMax}
				{#if ratio < 1}
					<div class="absolute bottom-0.5 left-0.5 right-0.5 h-[2px] rounded-full bg-gray-700/80">
						<div
							class="h-full rounded-full"
							style:width="{ratio * 100}%"
							style:background-color={durabilityColor(ratio)}
						></div>
					</div>
				{/if}
			{/if}
			<span class="absolute -bottom-0.5 -right-0.5 text-[8px] text-gray-600">{i + 1}</span>
		</button>
	{/each}
</div>
