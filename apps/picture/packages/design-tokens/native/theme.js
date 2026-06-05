'use strict';
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
	for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
	if ((from && typeof from === 'object') || typeof from === 'function') {
		for (let key of __getOwnPropNames(from))
			if (!__hasOwnProp.call(to, key) && key !== except)
				__defProp(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
				});
	}
	return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, '__esModule', { value: true }), mod);

// native/theme.ts
var theme_exports = {};
__export(theme_exports, {
	createNativeTheme: () => createNativeTheme,
	getThemeColors: () => getThemeColors,
	getThemeVariants: () => getThemeVariants,
	isValidThemeVariant: () => isValidThemeVariant,
});
module.exports = __toCommonJS(theme_exports);

// src/colors.ts
var baseColors = {
	// Pure colors
	black: '#000000',
	white: '#ffffff',
	// Grays
	gray: {
		50: '#f9fafb',
		100: '#f3f4f6',
		200: '#e5e7eb',
		300: '#d1d5db',
		400: '#9ca3af',
		500: '#6b7280',
		600: '#4b5563',
		700: '#374151',
		800: '#1f2937',
		900: '#111827',
		950: '#0a0a0a',
	},
	// Indigo (Default primary)
	indigo: {
		200: '#c7d2fe',
		300: '#a5b4fc',
		400: '#818cf8',
		500: '#6366f1',
		600: '#4f46e5',
		700: '#4338ca',
		800: '#3730a3',
	},
	// Violet (Default secondary)
	violet: {
		300: '#c4b5fd',
		400: '#a78bfa',
		500: '#8b5cf6',
		600: '#7c3aed',
	},
	// Orange (Sunset theme)
	orange: {
		300: '#fdba74',
		400: '#fb923c',
		500: '#f97316',
		600: '#ea580c',
	},
	// Pink (Sunset theme)
	pink: {
		300: '#f9a8d4',
		400: '#f472b6',
		500: '#ec4899',
		600: '#db2777',
	},
	// Sky (Ocean theme)
	sky: {
		300: '#7dd3fc',
		400: '#38bdf8',
		500: '#0ea5e9',
		600: '#0284c7',
	},
	// Emerald (Ocean theme + status)
	emerald: {
		300: '#6ee7b7',
		400: '#34d399',
		500: '#10b981',
		600: '#059669',
	},
	// Status colors
	red: {
		500: '#ef4444',
		600: '#dc2626',
	},
	amber: {
		500: '#f59e0b',
	},
	blue: {
		500: '#3b82f6',
	},
};
var semanticColors = {
	/**
	 * Dark mode colors
	 */
	dark: {
		// Backgrounds
		background: baseColors.black,
		surface: '#1a1a1a',
		elevated: '#242424',
		overlay: 'rgba(0, 0, 0, 0.8)',
		// Borders & Dividers
		border: '#383838',
		divider: '#2a2a2a',
		// Input fields
		input: {
			background: '#1f1f1f',
			border: '#383838',
			text: baseColors.gray[100],
			placeholder: baseColors.gray[500],
		},
		// Text colors
		text: {
			primary: baseColors.gray[100],
			secondary: baseColors.gray[300],
			tertiary: baseColors.gray[400],
			disabled: baseColors.gray[500],
			inverse: baseColors.black,
		},
		// Primary brand color (Indigo)
		primary: {
			default: baseColors.indigo[400],
			hover: baseColors.indigo[300],
			active: baseColors.indigo[500],
			light: baseColors.indigo[200],
			dark: baseColors.indigo[600],
			contrast: baseColors.white,
		},
		// Secondary accent color (Violet)
		secondary: {
			default: baseColors.violet[400],
			light: baseColors.violet[300],
			dark: baseColors.violet[500],
			contrast: baseColors.white,
		},
		// Status colors
		success: baseColors.emerald[500],
		warning: baseColors.amber[500],
		error: baseColors.red[500],
		info: baseColors.blue[500],
		// Semantic colors
		favorite: baseColors.red[500],
		like: baseColors.red[500],
		tag: baseColors.indigo[400],
		// Special UI elements
		skeleton: '#2a2a2a',
		shimmer: '#383838',
	},
	/**
	 * Light mode colors
	 */
	light: {
		// Backgrounds
		background: baseColors.white,
		surface: baseColors.gray[50],
		elevated: baseColors.white,
		overlay: 'rgba(0, 0, 0, 0.5)',
		// Borders & Dividers
		border: baseColors.gray[200],
		divider: baseColors.gray[100],
		// Input fields
		input: {
			background: baseColors.white,
			border: baseColors.gray[300],
			text: baseColors.gray[900],
			placeholder: baseColors.gray[400],
		},
		// Text colors
		text: {
			primary: baseColors.gray[900],
			secondary: baseColors.gray[700],
			tertiary: baseColors.gray[500],
			disabled: baseColors.gray[400],
			inverse: baseColors.white,
		},
		// Primary brand color (Indigo)
		primary: {
			default: baseColors.indigo[500],
			hover: baseColors.indigo[600],
			active: baseColors.indigo[700],
			light: baseColors.indigo[400],
			dark: baseColors.indigo[800],
			contrast: baseColors.white,
		},
		// Secondary accent color (Violet)
		secondary: {
			default: baseColors.violet[500],
			light: baseColors.violet[400],
			dark: baseColors.violet[600],
			contrast: baseColors.white,
		},
		// Status colors
		success: baseColors.emerald[500],
		warning: baseColors.amber[500],
		error: baseColors.red[500],
		info: baseColors.blue[500],
		// Semantic colors
		favorite: baseColors.red[500],
		like: baseColors.red[500],
		tag: baseColors.indigo[500],
		// Special UI elements
		skeleton: baseColors.gray[200],
		shimmer: baseColors.gray[100],
	},
};

// src/shadows.ts
var shadows = {
	dark: {
		sm: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.2,
			shadowRadius: 2,
			elevation: 2,
			// Android
		},
		md: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 6,
			elevation: 4,
		},
		lg: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 10 },
			shadowOpacity: 0.4,
			shadowRadius: 15,
			elevation: 8,
		},
	},
	light: {
		sm: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 2,
			elevation: 2,
		},
		md: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.15,
			shadowRadius: 6,
			elevation: 4,
		},
		lg: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 10 },
			shadowOpacity: 0.2,
			shadowRadius: 15,
			elevation: 8,
		},
	},
};
var opacity = {
	disabled: 0.5,
	overlay: 0.8,
	hover: 0.9,
	pressed: 0.7,
};

// src/themes/default.ts
var defaultTheme = {
	name: 'default',
	displayName: 'Indigo',
	colors: {
		light: semanticColors.light,
		dark: semanticColors.dark,
	},
	shadows,
	opacity,
};

// src/themes/sunset.ts
var sunsetTheme = {
	name: 'sunset',
	displayName: 'Sunset',
	colors: {
		light: semanticColors.light,
		// Uses default light mode
		dark: {
			...semanticColors.dark,
			// Override backgrounds for warmer tone
			background: '#0a0a0a',
			surface: '#1f1410',
			elevated: '#2a1f1a',
			// Override borders
			border: '#3d2f28',
			divider: '#2a1f1a',
			// Override input
			input: {
				background: '#1a1410',
				border: '#3d2f28',
				text: '#fef3c7',
				// amber-100
				placeholder: '#92400e',
				// amber-800
			},
			// Override text colors (warmer)
			text: {
				primary: '#fef3c7',
				// amber-100
				secondary: '#fcd34d',
				// amber-300
				tertiary: '#f59e0b',
				// amber-500
				disabled: '#92400e',
				// amber-800
				inverse: '#0a0a0a',
			},
			// Primary: Orange
			primary: {
				default: baseColors.orange[400],
				hover: baseColors.orange[300],
				active: baseColors.orange[500],
				light: '#fed7aa',
				// orange-200
				dark: baseColors.orange[600],
				contrast: baseColors.white,
			},
			// Secondary: Pink
			secondary: {
				default: baseColors.pink[400],
				light: baseColors.pink[300],
				dark: baseColors.pink[500],
				contrast: baseColors.white,
			},
			// Status
			success: baseColors.emerald[500],
			warning: '#fbbf24',
			// amber-400
			error: '#f43f5e',
			// rose-500
			info: '#60a5fa',
			// blue-400
			// Semantic
			favorite: '#f43f5e',
			// rose-500
			like: '#f43f5e',
			// rose-500
			tag: baseColors.orange[400],
			// Special
			skeleton: '#2a1f1a',
			shimmer: '#3d2f28',
		},
	},
	shadows,
	opacity,
};

// src/themes/ocean.ts
var oceanColors = {
	teal: {
		200: '#99f6e4',
		300: '#5eead4',
		400: '#2dd4bf',
		500: '#14b8a6',
		600: '#0d9488',
	},
	cyan: {
		300: '#67e8f9',
		400: '#22d3ee',
		500: '#06b6d4',
	},
	slate: {
		700: '#334155',
		800: '#1e293b',
		900: '#0f172a',
		950: '#020617',
	},
};
var oceanTheme = {
	name: 'ocean',
	displayName: 'Ocean',
	colors: {
		light: semanticColors.light,
		// Uses default light mode
		dark: {
			...semanticColors.dark,
			// Override backgrounds for cooler tone
			background: oceanColors.slate[950],
			surface: oceanColors.slate[900],
			elevated: oceanColors.slate[800],
			// Override borders
			border: oceanColors.slate[700],
			divider: oceanColors.slate[800],
			// Override input
			input: {
				background: oceanColors.slate[900],
				border: oceanColors.slate[700],
				text: '#e0f2fe',
				// sky-100
				placeholder: '#0c4a6e',
				// sky-900
			},
			// Override text colors (cooler)
			text: {
				primary: '#e0f2fe',
				// sky-100
				secondary: '#7dd3fc',
				// sky-300
				tertiary: '#38bdf8',
				// sky-400
				disabled: '#0c4a6e',
				// sky-900
				inverse: oceanColors.slate[950],
			},
			// Primary: Teal
			primary: {
				default: oceanColors.teal[400],
				hover: oceanColors.teal[300],
				active: oceanColors.teal[500],
				light: oceanColors.teal[200],
				dark: oceanColors.teal[600],
				contrast: baseColors.white,
			},
			// Secondary: Cyan
			secondary: {
				default: oceanColors.cyan[400],
				light: oceanColors.cyan[300],
				dark: oceanColors.cyan[500],
				contrast: baseColors.white,
			},
			// Status
			success: baseColors.emerald[500],
			warning: '#fbbf24',
			// amber-400
			error: '#f43f5e',
			// rose-500
			info: '#0ea5e9',
			// sky-500
			// Semantic
			favorite: '#f43f5e',
			// rose-500
			like: '#f43f5e',
			// rose-500
			tag: oceanColors.teal[400],
			// Special
			skeleton: oceanColors.slate[800],
			shimmer: oceanColors.slate[700],
		},
	},
	shadows,
	opacity,
};

// src/themes/index.ts
var themes = {
	default: defaultTheme,
	sunset: sunsetTheme,
	ocean: oceanTheme,
};

// src/spacing.ts
var spacing = {
	0: 0,
	1: 4,
	// 0.25rem
	2: 8,
	// 0.5rem
	3: 12,
	// 0.75rem
	4: 16,
	// 1rem
	5: 20,
	// 1.25rem
	6: 24,
	// 1.5rem
	7: 28,
	// 1.75rem
	8: 32,
	// 2rem
	9: 36,
	// 2.25rem
	10: 40,
	// 2.5rem
	11: 44,
	// 2.75rem
	12: 48,
	// 3rem
	14: 56,
	// 3.5rem
	16: 64,
	// 4rem
	20: 80,
	// 5rem
	24: 96,
	// 6rem
	28: 112,
	// 7rem
	32: 128,
	// 8rem
};
var borderRadius = {
	none: 0,
	sm: 4,
	DEFAULT: 8,
	md: 8,
	lg: 12,
	xl: 16,
	'2xl': 24,
	'3xl': 32,
	full: 9999,
};

// src/typography.ts
var fontSize = {
	xs: 12,
	sm: 14,
	base: 16,
	lg: 18,
	xl: 20,
	'2xl': 24,
	'3xl': 30,
	'4xl': 36,
	'5xl': 48,
	'6xl': 60,
	'7xl': 72,
	'8xl': 96,
};
var fontWeight = {
	regular: '400',
	medium: '500',
	semibold: '600',
	bold: '700',
};

// native/theme.ts
function getThemeColors(variant = 'default', mode = 'dark') {
	const theme = themes[variant];
	return theme.colors[mode];
}
function createNativeTheme(variant = 'default', mode = 'dark') {
	const theme = themes[variant];
	const colors = theme.colors[mode];
	const shadows2 = theme.shadows[mode];
	return {
		variant,
		mode,
		colors,
		spacing,
		borderRadius,
		fontSize,
		fontWeight,
		shadows: shadows2,
		opacity: theme.opacity,
	};
}
function getThemeVariants() {
	return Object.keys(themes);
}
function isValidThemeVariant(variant) {
	return variant in themes;
}
// Annotate the CommonJS export names for ESM import in node:
0 &&
	(module.exports = {
		createNativeTheme,
		getThemeColors,
		getThemeVariants,
		isValidThemeVariant,
	});
