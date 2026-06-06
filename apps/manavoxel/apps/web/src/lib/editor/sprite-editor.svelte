<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { SpriteData } from './types';

	// Props
	const {
		width = 16,
		height = 32,
		initialData = undefined as Uint8Array | undefined,
		onSave = undefined as ((data: SpriteData) => void) | undefined,
		onClose = undefined as (() => void) | undefined,
	} = $props();

	// State
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let previewCanvas: HTMLCanvasElement;
	let previewCtx: CanvasRenderingContext2D;

	const frameSize = untrack(() => width * height * 4);
	let frames: Uint8Array[] = $state([new Uint8Array(frameSize)]); // RGBA per frame
	let currentFrame = $state(0);
	let currentColor = $state('#FF4444');
	let currentTool = $state<'brush' | 'eraser' | 'fill' | 'pipette'>('brush');
	let isDrawing = $state(false);
	const zoom = $state(8); // Each sprite pixel = 8 screen pixels
	let animPlaying = $state(false);
	let animInterval: ReturnType<typeof setInterval> | null = null;

	// Color palette
	const palette = [
		'#FF4444',
		'#FF8844',
		'#FFCC44',
		'#88FF44',
		'#44FF88',
		'#44FFCC',
		'#44CCFF',
		'#4488FF',
		'#8844FF',
		'#CC44FF',
		'#FF44CC',
		'#FF4488',
		'#FFFFFF',
		'#CCCCCC',
		'#888888',
		'#444444',
		'#000000',
		'#8B4513',
		'#DAA520',
		'#228B22',
		'#4169E1',
		'#9400D3',
		'#FF69B4',
		'#DC143C',
	];

	// Undo stack
	let undoStack: Uint8Array[] = $state([]);
	let redoStack: Uint8Array[] = $state([]);

	function saveUndo() {
		undoStack = [...undoStack, new Uint8Array(frames[currentFrame])];
		if (undoStack.length > 30) undoStack = undoStack.slice(-30);
		redoStack = [];
	}

	function undo() {
		if (undoStack.length === 0) return;
		redoStack = [...redoStack, new Uint8Array(frames[currentFrame])];
		frames[currentFrame] = undoStack[undoStack.length - 1];
		undoStack = undoStack.slice(0, -1);
		renderCanvas();
	}

	function redo() {
		if (redoStack.length === 0) return;
		undoStack = [...undoStack, new Uint8Array(frames[currentFrame])];
		frames[currentFrame] = redoStack[redoStack.length - 1];
		redoStack = redoStack.slice(0, -1);
		renderCanvas();
	}

	// Pixel operations
	function hexToRGBA(hex: string): [number, number, number, number] {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return [r, g, b, 255];
	}

	function getPixel(x: number, y: number): [number, number, number, number] {
		const p = frames[currentFrame];
		const i = (y * width + x) * 4;
		return [p[i], p[i + 1], p[i + 2], p[i + 3]];
	}

	function setPixel(x: number, y: number, r: number, g: number, b: number, a: number) {
		if (x < 0 || x >= width || y < 0 || y >= height) return;
		const p = frames[currentFrame];
		const i = (y * width + x) * 4;
		p[i] = r;
		p[i + 1] = g;
		p[i + 2] = b;
		p[i + 3] = a;
	}

	function colorsMatch(a: [number, number, number, number], b: [number, number, number, number]) {
		return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
	}

	function floodFillAt(sx: number, sy: number) {
		const target = getPixel(sx, sy);
		const [r, g, b, a] = hexToRGBA(currentColor);
		if (colorsMatch(target, [r, g, b, a])) return;

		const stack: [number, number][] = [[sx, sy]];
		// Local, non-reactive scratch set for the flood-fill algorithm — never
		// rendered or tracked, so SvelteSet would add reactivity overhead for nothing.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		let iterations = 0;

		while (stack.length > 0 && iterations < 50000) {
			const [x, y] = stack.pop()!;
			const key = `${x},${y}`;
			if (visited.has(key)) continue;
			visited.add(key);
			if (x < 0 || x >= width || y < 0 || y >= height) continue;
			if (!colorsMatch(getPixel(x, y), target)) continue;

			setPixel(x, y, r, g, b, a);
			stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
			iterations++;
		}
	}

	// Canvas rendering
	function renderCanvas() {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw pixels
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const [r, g, b, a] = getPixel(x, y);
				if (a === 0) continue;
				ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
				ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
			}
		}

		// Draw grid
		ctx.strokeStyle = 'rgba(255,255,255,0.08)';
		ctx.lineWidth = 0.5;
		for (let x = 0; x <= width; x++) {
			ctx.beginPath();
			ctx.moveTo(x * zoom, 0);
			ctx.lineTo(x * zoom, height * zoom);
			ctx.stroke();
		}
		for (let y = 0; y <= height; y++) {
			ctx.beginPath();
			ctx.moveTo(0, y * zoom);
			ctx.lineTo(width * zoom, y * zoom);
			ctx.stroke();
		}

		// Update preview
		renderPreview();
	}

	function renderPreview() {
		if (!previewCtx) return;
		previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

		const scale = 2;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const [r, g, b, a] = getPixel(x, y);
				if (a === 0) continue;
				previewCtx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
				previewCtx.fillRect(x * scale, y * scale, scale, scale);
			}
		}
	}

	// Mouse handlers
	function getPixelPos(e: MouseEvent): [number, number] {
		const rect = canvas.getBoundingClientRect();
		const x = Math.floor((e.clientX - rect.left) / zoom);
		const y = Math.floor((e.clientY - rect.top) / zoom);
		return [x, y];
	}

	function handleMouseDown(e: MouseEvent) {
		e.preventDefault();
		const [x, y] = getPixelPos(e);

		if (currentTool === 'pipette') {
			const [r, g, b, a] = getPixel(x, y);
			if (a > 0) {
				currentColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
				currentTool = 'brush';
			}
			return;
		}

		if (currentTool === 'fill') {
			saveUndo();
			floodFillAt(x, y);
			renderCanvas();
			return;
		}

		saveUndo();
		isDrawing = true;
		applyTool(x, y);
		renderCanvas();
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDrawing) return;
		const [x, y] = getPixelPos(e);
		applyTool(x, y);
		renderCanvas();
	}

	function handleMouseUp() {
		isDrawing = false;
	}

	function applyTool(x: number, y: number) {
		if (x < 0 || x >= width || y < 0 || y >= height) return;
		if (currentTool === 'brush') {
			const [r, g, b, a] = hexToRGBA(currentColor);
			setPixel(x, y, r, g, b, a);
		} else if (currentTool === 'eraser') {
			setPixel(x, y, 0, 0, 0, 0);
		}
	}

	// Mirror operations
	function mirrorH() {
		saveUndo();
		const src = frames[currentFrame];
		const newPixels = new Uint8Array(src.length);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const srcI = (y * width + x) * 4;
				const dstI = (y * width + (width - 1 - x)) * 4;
				newPixels[dstI] = src[srcI];
				newPixels[dstI + 1] = src[srcI + 1];
				newPixels[dstI + 2] = src[srcI + 2];
				newPixels[dstI + 3] = src[srcI + 3];
			}
		}
		frames[currentFrame] = newPixels;
		renderCanvas();
	}

	function mirrorV() {
		saveUndo();
		const src = frames[currentFrame];
		const newPixels = new Uint8Array(src.length);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const srcI = (y * width + x) * 4;
				const dstI = ((height - 1 - y) * width + x) * 4;
				newPixels[dstI] = src[srcI];
				newPixels[dstI + 1] = src[srcI + 1];
				newPixels[dstI + 2] = src[srcI + 2];
				newPixels[dstI + 3] = src[srcI + 3];
			}
		}
		frames[currentFrame] = newPixels;
		renderCanvas();
	}

	function clearAll() {
		saveUndo();
		frames[currentFrame] = new Uint8Array(frameSize);
		renderCanvas();
	}

	// Frame management
	function addFrame() {
		// Duplicate current frame
		frames = [...frames, new Uint8Array(frames[currentFrame])];
		currentFrame = frames.length - 1;
		renderCanvas();
	}

	function removeFrame() {
		if (frames.length <= 1) return;
		frames = frames.filter((_, i) => i !== currentFrame);
		if (currentFrame >= frames.length) currentFrame = frames.length - 1;
		renderCanvas();
	}

	function prevFrame() {
		currentFrame = (currentFrame - 1 + frames.length) % frames.length;
		renderCanvas();
	}

	function nextFrame() {
		currentFrame = (currentFrame + 1) % frames.length;
		renderCanvas();
	}

	function togglePlayAnimation() {
		if (animPlaying) {
			if (animInterval) clearInterval(animInterval);
			animInterval = null;
			animPlaying = false;
		} else {
			animPlaying = true;
			animInterval = setInterval(() => {
				currentFrame = (currentFrame + 1) % frames.length;
				renderPreview();
			}, 150); // ~6.7 FPS
		}
	}

	function handleSave() {
		// Concatenate all frames into a single pixel buffer
		const totalPixels = new Uint8Array(frameSize * frames.length);
		for (let i = 0; i < frames.length; i++) {
			totalPixels.set(frames[i], i * frameSize);
		}
		onSave?.({ pixels: totalPixels, width, height, frames: frames.length });
	}

	// Keyboard shortcuts
	function handleKeyDown(e: KeyboardEvent) {
		if (e.ctrlKey && e.key === 'z') {
			e.preventDefault();
			undo();
		}
		if (e.ctrlKey && e.key === 'y') {
			e.preventDefault();
			redo();
		}
		if (e.key === 'b') currentTool = 'brush';
		if (e.key === 'e') currentTool = 'eraser';
		if (e.key === 'g') currentTool = 'fill';
		if (e.key === 'i') currentTool = 'pipette';
	}

	onMount(() => {
		ctx = canvas.getContext('2d')!;
		previewCtx = previewCanvas.getContext('2d')!;

		if (initialData) {
			// Split initial data into frames
			const numFrames = Math.max(1, Math.floor(initialData.length / frameSize));
			frames = [];
			for (let i = 0; i < numFrames; i++) {
				frames.push(new Uint8Array(initialData.slice(i * frameSize, (i + 1) * frameSize)));
			}
			currentFrame = 0;
		}

		renderCanvas();

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			if (animInterval) clearInterval(animInterval);
		};
	});
</script>

<div class="flex gap-4 rounded-xl bg-gray-900 p-4 shadow-2xl">
	<!-- Canvas -->
	<div class="flex flex-col gap-2">
		<div
			class="overflow-auto rounded border border-gray-700 bg-gray-950"
			style:max-height="500px"
			style:max-width="500px"
		>
			<canvas
				bind:this={canvas}
				width={width * zoom}
				height={height * zoom}
				class="cursor-crosshair"
				style:image-rendering="pixelated"
				onmousedown={handleMouseDown}
				onmousemove={handleMouseMove}
				onmouseup={handleMouseUp}
				onmouseleave={handleMouseUp}
				oncontextmenu={(e) => e.preventDefault()}
			></canvas>
		</div>
		<div class="text-center text-xs text-gray-500">{width} x {height} px | Zoom: {zoom}x</div>
	</div>

	<!-- Right panel -->
	<div class="flex w-48 flex-col gap-3">
		<!-- Preview -->
		<div class="rounded border border-gray-700 bg-gray-950 p-2">
			<div class="mb-1 text-xs text-gray-500">Preview</div>
			<canvas
				bind:this={previewCanvas}
				width={width * 2}
				height={height * 2}
				class="mx-auto"
				style:image-rendering="pixelated"
			></canvas>
		</div>

		<!-- Frames -->
		<div class="rounded border border-gray-700 bg-gray-950 p-2">
			<div class="mb-1 flex items-center justify-between text-xs text-gray-500">
				<span>Frame {currentFrame + 1}/{frames.length}</span>
				<button
					class="rounded px-1.5 py-0.5 text-[10px] {animPlaying
						? 'bg-red-600 text-white'
						: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
					onclick={togglePlayAnimation}
				>
					{animPlaying ? 'Stop' : 'Play'}
				</button>
			</div>
			<div class="flex gap-1">
				<button
					class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-600"
					onclick={prevFrame}>←</button
				>
				<button
					class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-600"
					onclick={nextFrame}>→</button
				>
				<button
					class="rounded bg-emerald-700 px-2 py-0.5 text-xs text-white hover:bg-emerald-600"
					onclick={addFrame}>+</button
				>
				{#if frames.length > 1}
					<button
						class="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600"
						onclick={removeFrame}>−</button
					>
				{/if}
			</div>
		</div>

		<!-- Tools -->
		<div class="flex flex-wrap gap-1">
			{#each [{ id: 'brush', label: 'Brush', key: 'B' }, { id: 'eraser', label: 'Eraser', key: 'E' }, { id: 'fill', label: 'Fill', key: 'G' }, { id: 'pipette', label: 'Pick', key: 'I' }] as tool}
				<button
					class="rounded px-2 py-1 text-xs transition {currentTool === tool.id
						? 'bg-emerald-600 text-white'
						: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
					onclick={() => (currentTool = tool.id as typeof currentTool)}
				>
					{tool.label}
				</button>
			{/each}
		</div>

		<!-- Actions -->
		<div class="flex flex-wrap gap-1">
			<button
				class="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
				onclick={mirrorH}
			>
				Mirror H
			</button>
			<button
				class="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
				onclick={mirrorV}
			>
				Mirror V
			</button>
			<button
				class="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700"
				onclick={clearAll}
			>
				Clear
			</button>
		</div>

		<!-- Undo/Redo -->
		<div class="flex gap-1">
			<button
				class="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-30"
				disabled={undoStack.length === 0}
				onclick={undo}
			>
				Undo
			</button>
			<button
				class="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-30"
				disabled={redoStack.length === 0}
				onclick={redo}
			>
				Redo
			</button>
		</div>

		<!-- Color picker -->
		<div>
			<div class="mb-1 text-xs text-gray-500">Color</div>
			<div class="mb-2 flex items-center gap-2">
				<div
					class="h-6 w-6 rounded border border-gray-600"
					style:background-color={currentColor}
				></div>
				<input type="color" bind:value={currentColor} class="h-6 w-10 cursor-pointer" />
			</div>
			<div class="grid grid-cols-6 gap-1">
				{#each palette as color}
					<button
						class="h-5 w-5 rounded border transition hover:scale-110 {currentColor === color
							? 'border-white'
							: 'border-gray-700'}"
						style:background-color={color}
						aria-label="Color {color}"
						onclick={() => (currentColor = color)}
					></button>
				{/each}
			</div>
		</div>

		<!-- Save/Close -->
		<div class="mt-auto flex gap-2">
			<button
				class="flex-1 rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
				onclick={handleSave}
			>
				Save Item
			</button>
			{#if onClose}
				<button
					class="rounded bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600"
					onclick={onClose}
				>
					Close
				</button>
			{/if}
		</div>
	</div>
</div>
