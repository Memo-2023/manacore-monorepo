<script lang="ts">
	/**
	 * ManaLogoIcon — Wortmarken-Logo „Mana-Bunt" als Inline-SVG.
	 *
	 * Geometrie aus mana/docs/BRAND.md: viewBox 0 0 24 7, 5 Cubic-Bezier-
	 * Bögen + 2 Querstriche, Spektrum-Farbverlauf je Bogen. Animation
	 * aus BRAND.md (M-A-N-A-Sequenz, ~1.1s) ist optional via Prop.
	 *
	 * Default ist die statische Variante. Animationen respektieren
	 * `prefers-reduced-motion: reduce` (kein draw-on, statisches Logo).
	 */

	type Size = 'sm' | 'md' | 'lg' | 'xl';

	interface Props {
		size?: Size | number;
		animated?: boolean;
		ariaLabel?: string;
		title?: string;
		/** v0.1.x-Compat. */
		class?: string;
	}

	let {
		size = 'md',
		animated = false,
		ariaLabel = 'mana',
		title,
		class: className = '',
	}: Props = $props();

	const normalizedSize = $derived.by<Size>(() => {
		if (typeof size === 'number') {
			if (size <= 16) return 'sm';
			if (size <= 24) return 'md';
			if (size <= 32) return 'lg';
			return 'xl';
		}
		return size;
	});
</script>

<svg
	class="mana-logo size-{normalizedSize} {className}"
	class:animated
	viewBox="0 0 24 7"
	xmlns="http://www.w3.org/2000/svg"
	role="img"
	aria-label={ariaLabel}
>
	{#if title}<title>{title}</title>{/if}
	<defs>
		<linearGradient id="mana-arch-1" x1="0" x2="1" y1="0" y2="0">
			<stop offset="0%" stop-color="#000000" />
			<stop offset="55%" stop-color="#FFB700" />
			<stop offset="100%" stop-color="#FF6600" />
		</linearGradient>
		<linearGradient id="mana-arch-2" x1="0" x2="1" y1="0" y2="0">
			<stop offset="0%" stop-color="#FF6600" />
			<stop offset="55%" stop-color="#FF0000" />
			<stop offset="100%" stop-color="#FF00AA" />
		</linearGradient>
		<linearGradient id="mana-arch-3" x1="0" x2="1" y1="0" y2="0">
			<stop offset="0%" stop-color="#FF00AA" />
			<stop offset="55%" stop-color="#8225D4" />
			<stop offset="100%" stop-color="#004CFF" />
		</linearGradient>
		<linearGradient id="mana-arch-4" x1="0" x2="1" y1="0" y2="0">
			<stop offset="0%" stop-color="#004CFF" />
			<stop offset="100%" stop-color="#07D6FF" />
		</linearGradient>
		<linearGradient id="mana-arch-5" x1="0" x2="1" y1="0" y2="0">
			<stop offset="0%" stop-color="#07D6FF" />
			<stop offset="55%" stop-color="#00C013" />
			<stop offset="100%" stop-color="#FFFFFF" />
		</linearGradient>
		<linearGradient id="mana-cross-1" x1="0" x2="1" y1="0" y2="0">
			<stop offset="0%" stop-color="#F902AC" />
			<stop offset="100%" stop-color="#05A6FE" />
		</linearGradient>
		<linearGradient id="mana-cross-2" x1="0" x2="1" y1="0" y2="0">
			<stop offset="0%" stop-color="#07D6FE" />
			<stop offset="100%" stop-color="#9DFFA8" />
		</linearGradient>
	</defs>

	<g fill="none" stroke-linecap="round" stroke-width="1.2">
		<path
			class="arch arch--1"
			pathLength="1"
			stroke="url(#mana-arch-1)"
			d="M 0 6 C 0.8 1.2 3.2 1.2 4 6"
		/>
		<path
			class="arch arch--2"
			pathLength="1"
			stroke="url(#mana-arch-2)"
			d="M 4 6 C 4.8 1.2 7.2 1.2 8 6"
		/>
		<path
			class="arch arch--3"
			pathLength="1"
			stroke="url(#mana-arch-3)"
			d="M 8 6 C 8.8 1.2 11.2 1.2 12 6"
		/>
		<path class="cross cross--1" pathLength="1" stroke="url(#mana-cross-1)" d="M 11 4 L 13 4" />
		<path
			class="arch arch--4"
			pathLength="1"
			stroke="url(#mana-arch-4)"
			d="M 12 6 C 12.8 1.2 15.2 1.2 16 6"
		/>
		<path
			class="arch arch--5"
			pathLength="1"
			stroke="url(#mana-arch-5)"
			d="M 16 6 C 16.8 1.2 19.2 1.2 20 6"
		/>
		<path class="cross cross--2" pathLength="1" stroke="url(#mana-cross-2)" d="M 19 4 L 21 4" />
	</g>
</svg>

<style>
	.mana-logo {
		display: inline-block;
		flex-shrink: 0;
		overflow: visible;
	}

	.size-sm {
		height: 1rem;
	}
	.size-md {
		height: 1.5rem;
	}
	.size-lg {
		height: 2.25rem;
	}
	.size-xl {
		height: 3rem;
	}

	/* Animation: Wellen-Intro M-A-N-A — Bogen für Bogen, ~1.1s */
	.animated .arch,
	.animated .cross {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		opacity: 0;
		animation-fill-mode: forwards;
		animation-timing-function: ease-out;
	}

	.animated .arch--1 {
		animation: draw 0.25s 0s forwards;
	}
	.animated .arch--2 {
		animation: draw 0.25s 0.18s forwards;
	}
	.animated .arch--3 {
		animation: draw 0.25s 0.36s forwards;
	}
	.animated .cross--1 {
		animation: draw 0.12s 0.5s forwards;
	}
	.animated .arch--4 {
		animation: draw 0.25s 0.58s forwards;
	}
	.animated .arch--5 {
		animation: draw 0.25s 0.76s forwards;
	}
	.animated .cross--2 {
		animation: draw 0.12s 0.95s forwards;
	}

	@keyframes draw {
		0% {
			stroke-dashoffset: 1;
			opacity: 0;
		}
		1% {
			opacity: 1;
		}
		100% {
			stroke-dashoffset: 0;
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animated .arch,
		.animated .cross {
			stroke-dasharray: none;
			stroke-dashoffset: 0;
			opacity: 1;
			animation: none;
		}
	}
</style>
