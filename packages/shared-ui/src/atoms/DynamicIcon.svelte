<script lang="ts">
	/**
	 * DynamicIcon — kleine Inline-SVG-Map für die meistgenutzten UI-Icons.
	 *
	 * Bewusst KEIN phosphor-svelte-Peer-Dep — shared-ui-2 hält die
	 * Konsumenten-Bundle klein. Konsumenten die eigene Icons brauchen,
	 * passen sie als `iconSvg`-String oder direkt als child-Snippet an
	 * Komponenten wie Pill / Button / TagChip.
	 *
	 * Icons sind als Inline-Strings im 16×16-viewBox, `currentColor`,
	 * `stroke-width: 1.6`. Das passt zu den Pill/Badge/Button-Größen
	 * und folgt dem Mana-Stroke-basierten Symbol-Vokabular (siehe
	 * mana/docs/SYMBOLS.md — gleicher Pattern, nur generischere
	 * Funktional-Icons).
	 */

	type Size = 'xs' | 'sm' | 'md' | 'lg';

	interface Props {
		name?: IconName | string;
		iconSvg?: string;
		/** Symbolische Größe oder Pixel-Wert (v0.1.x-Compat). */
		size?: Size | number;
		ariaLabel?: string;
		/** v0.1.x-Compat: Phosphor-Property, heute ignoriert (alle Icons sind outline-only mit Fill-Varianten als eigene Namen). */
		weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
		/** v0.1.x-Compat: Custom-Class auf SVG. */
		class?: string;
		/** v0.1.x-Compat: Direkte Farbe (heute über CSS-color steuerbar; Prop wird ignoriert wenn leer). */
		color?: string;
	}

	let { name, iconSvg, size = 'md', ariaLabel, class: className = '', color }: Props = $props();

	const normalizedSize = $derived.by<Size>(() => {
		if (typeof size === 'number') {
			if (size <= 12) return 'xs';
			if (size <= 14) return 'sm';
			if (size <= 20) return 'md';
			return 'lg';
		}
		return size;
	});

	type IconName =
		| 'check'
		| 'x'
		| 'plus'
		| 'minus'
		| 'search'
		| 'user'
		| 'users'
		| 'gear'
		| 'home'
		| 'tag'
		| 'heart'
		| 'star'
		| 'caret-down'
		| 'caret-up'
		| 'caret-left'
		| 'caret-right'
		| 'arrow-left'
		| 'arrow-right'
		| 'info'
		| 'warning'
		| 'error'
		| 'success'
		| 'trash'
		| 'edit'
		| 'eye'
		| 'eye-off'
		| 'calendar'
		| 'clock'
		| 'mail'
		| 'link'
		| 'external'
		| 'pin'
		| 'pin-fill'
		| 'heart-fill'
		| 'star-fill'
		| 'bell'
		| 'bell-fill'
		| 'bell-slash'
		| 'archive'
		| 'folder-open';

	const ICONS: Record<IconName, string> = {
		check:
			'<path d="M3 8l3.5 3.5L13 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
		x: '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
		plus: '<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
		minus: '<path d="M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
		search:
			'<circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
		user: '<circle cx="8" cy="6" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3 14c0-2.5 2.2-4 5-4s5 1.5 5 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
		users:
			'<circle cx="6" cy="6" r="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="11.5" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 13.5c0-2 1.7-3.5 4-3.5s4 1.5 4 3.5M14.5 13c0-1.5-1.2-2.5-3-2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
		gear: '<circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8l-1.4-1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
		home: '<path d="M2 7.5L8 2l6 5.5V14H2.5V7.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
		tag: '<path d="M8 1.5h5.5V7L7 13.5l-5.5-5.5L8 1.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="11" cy="5" r="0.9" fill="currentColor"/>',
		heart:
			'<path d="M8 13.5s-5-3-5-7a3 3 0 015-2 3 3 0 015 2c0 4-5 7-5 7z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
		star: '<path d="M8 1.5l1.9 4 4.4.6-3.2 3 .8 4.3L8 11.4l-3.9 2 .8-4.3-3.2-3 4.4-.6L8 1.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
		'caret-down':
			'<path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
		'caret-up':
			'<path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
		'caret-left':
			'<path d="M10 3l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
		'caret-right':
			'<path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
		'arrow-left':
			'<path d="M13 8H3M7 4l-4 4 4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		'arrow-right':
			'<path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		info: '<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 7v4M8 5v0.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
		warning:
			'<path d="M8 1.5L14.5 13.5h-13L8 1.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6.5v3.5M8 11.5v0.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
		error:
			'<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.5v4M8 11v0.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
		success:
			'<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 8l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
		trash:
			'<path d="M3 4.5h10M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M4.5 4.5v9.5h7V4.5M7 7v5M9 7v5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		edit: '<path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
		eye: '<path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/>',
		'eye-off':
			'<path d="M2 2l12 12M3 5C2 6.5 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1.2 0 2.2-.4 3.1-.9M6.5 4c.5-.2 1-.3 1.5-.3 4 0 6.5 4.3 6.5 4.3s-.6 1-1.7 2.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		calendar:
			'<rect x="2.5" y="3.5" width="11" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
		clock:
			'<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.5V8l2.5 2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		mail: '<rect x="2" y="3.5" width="12" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 4.5l6 4 6-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		link: '<path d="M7 9l2-2M9 4l1-1a3 3 0 014.2 4.2L13 8.5M7 12l-1 1a3 3 0 01-4.2-4.2L3 7.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
		external:
			'<path d="M9 2.5h4.5V7M13.5 2.5L7.5 8.5M11 9v4.5H2.5V5H7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		pin: '<path d="M10 1.5l4.5 4.5-3 1-2 4-1.5-1.5-3 3v-3l3-3-1.5-1.5 4-2 1.5-1.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
		'pin-fill':
			'<path d="M10 1.5l4.5 4.5-3 1-2 4-1.5-1.5-3 3v-3l3-3-1.5-1.5 4-2 1.5-1.5z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
		'heart-fill':
			'<path d="M8 13.5s-5-3-5-7a3 3 0 015-2 3 3 0 015 2c0 4-5 7-5 7z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
		'star-fill':
			'<path d="M8 1.5l1.9 4 4.4.6-3.2 3 .8 4.3L8 11.4l-3.9 2 .8-4.3-3.2-3 4.4-.6L8 1.5z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
		bell: '<path d="M8 2v1M4.5 6a3.5 3.5 0 117 0c0 3 1 4 1.5 5h-10c.5-1 1.5-2 1.5-5zM6.5 13a1.5 1.5 0 003 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		'bell-fill':
			'<path d="M4.5 6a3.5 3.5 0 117 0c0 3 1 4 1.5 5h-10c.5-1 1.5-2 1.5-5z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 2v1M6.5 13a1.5 1.5 0 003 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
		'bell-slash':
			'<path d="M2 2l12 12M4.5 6a3.5 3.5 0 016-2.5M11.5 6c0 3 1 4 1.5 5H6M3 11h.5c.5-1 1-2 1-5M6.5 13a1.5 1.5 0 003 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		archive:
			'<path d="M2 3.5h12v3H2zM3 6.5v8h10v-8M6 9h4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		'folder-open':
			'<path d="M2 5.5V13a1 1 0 001 1h10.5l1.5-6H4.5L3 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 5.5V4a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1V8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
	};

	const resolvedSvg = $derived.by(() => {
		if (iconSvg) return iconSvg;
		if (name && (ICONS as Record<string, string>)[name])
			return (ICONS as Record<string, string>)[name];
		// Fallback: Frage-Markierung
		return '<path d="M5 6a3 3 0 016 0c0 1.5-1.5 2-2 2.5v1M8 12.5v0.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
	});
</script>

<svg
	class="icon size-{normalizedSize} {className}"
	style:color={color ?? undefined}
	viewBox="0 0 16 16"
	xmlns="http://www.w3.org/2000/svg"
	role={ariaLabel ? 'img' : undefined}
	aria-label={ariaLabel}
	aria-hidden={ariaLabel ? undefined : 'true'}
>
	{@html resolvedSvg}
</svg>

<style>
	.icon {
		display: inline-block;
		flex-shrink: 0;
		color: currentColor;
		vertical-align: middle;
	}

	.size-xs {
		width: 0.75rem;
		height: 0.75rem;
	}
	.size-sm {
		width: 0.875rem;
		height: 0.875rem;
	}
	.size-md {
		width: 1rem;
		height: 1rem;
	}
	.size-lg {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
