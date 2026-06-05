/**
 * Semantic color definitions
 * Maps intent/purpose to actual colors
 */
declare const semanticColors: {
	/**
	 * Dark mode colors
	 */
	readonly dark: {
		readonly background: '#000000';
		readonly surface: '#1a1a1a';
		readonly elevated: '#242424';
		readonly overlay: 'rgba(0, 0, 0, 0.8)';
		readonly border: '#383838';
		readonly divider: '#2a2a2a';
		readonly input: {
			readonly background: '#1f1f1f';
			readonly border: '#383838';
			readonly text: '#f3f4f6';
			readonly placeholder: '#6b7280';
		};
		readonly text: {
			readonly primary: '#f3f4f6';
			readonly secondary: '#d1d5db';
			readonly tertiary: '#9ca3af';
			readonly disabled: '#6b7280';
			readonly inverse: '#000000';
		};
		readonly primary: {
			readonly default: '#818cf8';
			readonly hover: '#a5b4fc';
			readonly active: '#6366f1';
			readonly light: '#c7d2fe';
			readonly dark: '#4f46e5';
			readonly contrast: '#ffffff';
		};
		readonly secondary: {
			readonly default: '#a78bfa';
			readonly light: '#c4b5fd';
			readonly dark: '#8b5cf6';
			readonly contrast: '#ffffff';
		};
		readonly success: '#10b981';
		readonly warning: '#f59e0b';
		readonly error: '#ef4444';
		readonly info: '#3b82f6';
		readonly favorite: '#ef4444';
		readonly like: '#ef4444';
		readonly tag: '#818cf8';
		readonly skeleton: '#2a2a2a';
		readonly shimmer: '#383838';
	};
	/**
	 * Light mode colors
	 */
	readonly light: {
		readonly background: '#ffffff';
		readonly surface: '#f9fafb';
		readonly elevated: '#ffffff';
		readonly overlay: 'rgba(0, 0, 0, 0.5)';
		readonly border: '#e5e7eb';
		readonly divider: '#f3f4f6';
		readonly input: {
			readonly background: '#ffffff';
			readonly border: '#d1d5db';
			readonly text: '#111827';
			readonly placeholder: '#9ca3af';
		};
		readonly text: {
			readonly primary: '#111827';
			readonly secondary: '#374151';
			readonly tertiary: '#6b7280';
			readonly disabled: '#9ca3af';
			readonly inverse: '#ffffff';
		};
		readonly primary: {
			readonly default: '#6366f1';
			readonly hover: '#4f46e5';
			readonly active: '#4338ca';
			readonly light: '#818cf8';
			readonly dark: '#3730a3';
			readonly contrast: '#ffffff';
		};
		readonly secondary: {
			readonly default: '#8b5cf6';
			readonly light: '#a78bfa';
			readonly dark: '#7c3aed';
			readonly contrast: '#ffffff';
		};
		readonly success: '#10b981';
		readonly warning: '#f59e0b';
		readonly error: '#ef4444';
		readonly info: '#3b82f6';
		readonly favorite: '#ef4444';
		readonly like: '#ef4444';
		readonly tag: '#6366f1';
		readonly skeleton: '#e5e7eb';
		readonly shimmer: '#f3f4f6';
	};
};
type SemanticColors = typeof semanticColors.dark;
type ColorMode = 'light' | 'dark';

/**
 * @memoro/design-tokens - Themes
 *
 * Theme variants with different color palettes.
 * All themes support both light and dark modes.
 */

/**
 * All available themes
 */
declare const themes: {
	readonly default: {
		readonly name: 'default';
		readonly displayName: 'Indigo';
		readonly colors: {
			readonly light: {
				readonly background: '#ffffff';
				readonly surface: '#f9fafb';
				readonly elevated: '#ffffff';
				readonly overlay: 'rgba(0, 0, 0, 0.5)';
				readonly border: '#e5e7eb';
				readonly divider: '#f3f4f6';
				readonly input: {
					readonly background: '#ffffff';
					readonly border: '#d1d5db';
					readonly text: '#111827';
					readonly placeholder: '#9ca3af';
				};
				readonly text: {
					readonly primary: '#111827';
					readonly secondary: '#374151';
					readonly tertiary: '#6b7280';
					readonly disabled: '#9ca3af';
					readonly inverse: '#ffffff';
				};
				readonly primary: {
					readonly default: '#6366f1';
					readonly hover: '#4f46e5';
					readonly active: '#4338ca';
					readonly light: '#818cf8';
					readonly dark: '#3730a3';
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: '#8b5cf6';
					readonly light: '#a78bfa';
					readonly dark: '#7c3aed';
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#f59e0b';
				readonly error: '#ef4444';
				readonly info: '#3b82f6';
				readonly favorite: '#ef4444';
				readonly like: '#ef4444';
				readonly tag: '#6366f1';
				readonly skeleton: '#e5e7eb';
				readonly shimmer: '#f3f4f6';
			};
			readonly dark: {
				readonly background: '#000000';
				readonly surface: '#1a1a1a';
				readonly elevated: '#242424';
				readonly overlay: 'rgba(0, 0, 0, 0.8)';
				readonly border: '#383838';
				readonly divider: '#2a2a2a';
				readonly input: {
					readonly background: '#1f1f1f';
					readonly border: '#383838';
					readonly text: '#f3f4f6';
					readonly placeholder: '#6b7280';
				};
				readonly text: {
					readonly primary: '#f3f4f6';
					readonly secondary: '#d1d5db';
					readonly tertiary: '#9ca3af';
					readonly disabled: '#6b7280';
					readonly inverse: '#000000';
				};
				readonly primary: {
					readonly default: '#818cf8';
					readonly hover: '#a5b4fc';
					readonly active: '#6366f1';
					readonly light: '#c7d2fe';
					readonly dark: '#4f46e5';
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: '#a78bfa';
					readonly light: '#c4b5fd';
					readonly dark: '#8b5cf6';
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#f59e0b';
				readonly error: '#ef4444';
				readonly info: '#3b82f6';
				readonly favorite: '#ef4444';
				readonly like: '#ef4444';
				readonly tag: '#818cf8';
				readonly skeleton: '#2a2a2a';
				readonly shimmer: '#383838';
			};
		};
		readonly shadows: {
			readonly dark: {
				readonly sm: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 1;
					};
					readonly shadowOpacity: 0.2;
					readonly shadowRadius: 2;
					readonly elevation: 2;
				};
				readonly md: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 4;
					};
					readonly shadowOpacity: 0.3;
					readonly shadowRadius: 6;
					readonly elevation: 4;
				};
				readonly lg: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 10;
					};
					readonly shadowOpacity: 0.4;
					readonly shadowRadius: 15;
					readonly elevation: 8;
				};
			};
			readonly light: {
				readonly sm: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 1;
					};
					readonly shadowOpacity: 0.1;
					readonly shadowRadius: 2;
					readonly elevation: 2;
				};
				readonly md: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 4;
					};
					readonly shadowOpacity: 0.15;
					readonly shadowRadius: 6;
					readonly elevation: 4;
				};
				readonly lg: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 10;
					};
					readonly shadowOpacity: 0.2;
					readonly shadowRadius: 15;
					readonly elevation: 8;
				};
			};
		};
		readonly opacity: {
			readonly disabled: 0.5;
			readonly overlay: 0.8;
			readonly hover: 0.9;
			readonly pressed: 0.7;
		};
	};
	readonly sunset: {
		readonly name: 'sunset';
		readonly displayName: 'Sunset';
		readonly colors: {
			readonly light: {
				readonly background: '#ffffff';
				readonly surface: '#f9fafb';
				readonly elevated: '#ffffff';
				readonly overlay: 'rgba(0, 0, 0, 0.5)';
				readonly border: '#e5e7eb';
				readonly divider: '#f3f4f6';
				readonly input: {
					readonly background: '#ffffff';
					readonly border: '#d1d5db';
					readonly text: '#111827';
					readonly placeholder: '#9ca3af';
				};
				readonly text: {
					readonly primary: '#111827';
					readonly secondary: '#374151';
					readonly tertiary: '#6b7280';
					readonly disabled: '#9ca3af';
					readonly inverse: '#ffffff';
				};
				readonly primary: {
					readonly default: '#6366f1';
					readonly hover: '#4f46e5';
					readonly active: '#4338ca';
					readonly light: '#818cf8';
					readonly dark: '#3730a3';
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: '#8b5cf6';
					readonly light: '#a78bfa';
					readonly dark: '#7c3aed';
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#f59e0b';
				readonly error: '#ef4444';
				readonly info: '#3b82f6';
				readonly favorite: '#ef4444';
				readonly like: '#ef4444';
				readonly tag: '#6366f1';
				readonly skeleton: '#e5e7eb';
				readonly shimmer: '#f3f4f6';
			};
			readonly dark: {
				readonly background: '#0a0a0a';
				readonly surface: '#1f1410';
				readonly elevated: '#2a1f1a';
				readonly border: '#3d2f28';
				readonly divider: '#2a1f1a';
				readonly input: {
					readonly background: '#1a1410';
					readonly border: '#3d2f28';
					readonly text: '#fef3c7';
					readonly placeholder: '#92400e';
				};
				readonly text: {
					readonly primary: '#fef3c7';
					readonly secondary: '#fcd34d';
					readonly tertiary: '#f59e0b';
					readonly disabled: '#92400e';
					readonly inverse: '#0a0a0a';
				};
				readonly primary: {
					readonly default: '#fb923c';
					readonly hover: '#fdba74';
					readonly active: '#f97316';
					readonly light: '#fed7aa';
					readonly dark: '#ea580c';
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: '#f472b6';
					readonly light: '#f9a8d4';
					readonly dark: '#ec4899';
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#fbbf24';
				readonly error: '#f43f5e';
				readonly info: '#60a5fa';
				readonly favorite: '#f43f5e';
				readonly like: '#f43f5e';
				readonly tag: '#fb923c';
				readonly skeleton: '#2a1f1a';
				readonly shimmer: '#3d2f28';
				readonly overlay: 'rgba(0, 0, 0, 0.8)';
			};
		};
		readonly shadows: {
			readonly dark: {
				readonly sm: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 1;
					};
					readonly shadowOpacity: 0.2;
					readonly shadowRadius: 2;
					readonly elevation: 2;
				};
				readonly md: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 4;
					};
					readonly shadowOpacity: 0.3;
					readonly shadowRadius: 6;
					readonly elevation: 4;
				};
				readonly lg: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 10;
					};
					readonly shadowOpacity: 0.4;
					readonly shadowRadius: 15;
					readonly elevation: 8;
				};
			};
			readonly light: {
				readonly sm: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 1;
					};
					readonly shadowOpacity: 0.1;
					readonly shadowRadius: 2;
					readonly elevation: 2;
				};
				readonly md: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 4;
					};
					readonly shadowOpacity: 0.15;
					readonly shadowRadius: 6;
					readonly elevation: 4;
				};
				readonly lg: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 10;
					};
					readonly shadowOpacity: 0.2;
					readonly shadowRadius: 15;
					readonly elevation: 8;
				};
			};
		};
		readonly opacity: {
			readonly disabled: 0.5;
			readonly overlay: 0.8;
			readonly hover: 0.9;
			readonly pressed: 0.7;
		};
	};
	readonly ocean: {
		readonly name: 'ocean';
		readonly displayName: 'Ocean';
		readonly colors: {
			readonly light: {
				readonly background: '#ffffff';
				readonly surface: '#f9fafb';
				readonly elevated: '#ffffff';
				readonly overlay: 'rgba(0, 0, 0, 0.5)';
				readonly border: '#e5e7eb';
				readonly divider: '#f3f4f6';
				readonly input: {
					readonly background: '#ffffff';
					readonly border: '#d1d5db';
					readonly text: '#111827';
					readonly placeholder: '#9ca3af';
				};
				readonly text: {
					readonly primary: '#111827';
					readonly secondary: '#374151';
					readonly tertiary: '#6b7280';
					readonly disabled: '#9ca3af';
					readonly inverse: '#ffffff';
				};
				readonly primary: {
					readonly default: '#6366f1';
					readonly hover: '#4f46e5';
					readonly active: '#4338ca';
					readonly light: '#818cf8';
					readonly dark: '#3730a3';
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: '#8b5cf6';
					readonly light: '#a78bfa';
					readonly dark: '#7c3aed';
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#f59e0b';
				readonly error: '#ef4444';
				readonly info: '#3b82f6';
				readonly favorite: '#ef4444';
				readonly like: '#ef4444';
				readonly tag: '#6366f1';
				readonly skeleton: '#e5e7eb';
				readonly shimmer: '#f3f4f6';
			};
			readonly dark: {
				readonly background: string;
				readonly surface: string;
				readonly elevated: string;
				readonly border: string;
				readonly divider: string;
				readonly input: {
					readonly background: string;
					readonly border: string;
					readonly text: '#e0f2fe';
					readonly placeholder: '#0c4a6e';
				};
				readonly text: {
					readonly primary: '#e0f2fe';
					readonly secondary: '#7dd3fc';
					readonly tertiary: '#38bdf8';
					readonly disabled: '#0c4a6e';
					readonly inverse: string;
				};
				readonly primary: {
					readonly default: string;
					readonly hover: string;
					readonly active: string;
					readonly light: string;
					readonly dark: string;
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: string;
					readonly light: string;
					readonly dark: string;
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#fbbf24';
				readonly error: '#f43f5e';
				readonly info: '#0ea5e9';
				readonly favorite: '#f43f5e';
				readonly like: '#f43f5e';
				readonly tag: string;
				readonly skeleton: string;
				readonly shimmer: string;
				readonly overlay: 'rgba(0, 0, 0, 0.8)';
			};
		};
		readonly shadows: {
			readonly dark: {
				readonly sm: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 1;
					};
					readonly shadowOpacity: 0.2;
					readonly shadowRadius: 2;
					readonly elevation: 2;
				};
				readonly md: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 4;
					};
					readonly shadowOpacity: 0.3;
					readonly shadowRadius: 6;
					readonly elevation: 4;
				};
				readonly lg: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 10;
					};
					readonly shadowOpacity: 0.4;
					readonly shadowRadius: 15;
					readonly elevation: 8;
				};
			};
			readonly light: {
				readonly sm: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 1;
					};
					readonly shadowOpacity: 0.1;
					readonly shadowRadius: 2;
					readonly elevation: 2;
				};
				readonly md: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 4;
					};
					readonly shadowOpacity: 0.15;
					readonly shadowRadius: 6;
					readonly elevation: 4;
				};
				readonly lg: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 10;
					};
					readonly shadowOpacity: 0.2;
					readonly shadowRadius: 15;
					readonly elevation: 8;
				};
			};
		};
		readonly opacity: {
			readonly disabled: 0.5;
			readonly overlay: 0.8;
			readonly hover: 0.9;
			readonly pressed: 0.7;
		};
	};
};
/**
 * Type exports
 */
type ThemeVariant = keyof typeof themes;

/**
 * @memoro/design-tokens - React Native Helpers
 *
 * Helper functions to use design tokens in React Native.
 */

/**
 * Get theme colors for a specific variant and mode
 */
declare function getThemeColors(variant?: ThemeVariant, mode?: ColorMode): SemanticColors;
/**
 * Create a complete React Native theme object
 */
declare function createNativeTheme(
	variant?: ThemeVariant,
	mode?: ColorMode
): {
	readonly variant: 'default' | 'sunset' | 'ocean';
	readonly mode: ColorMode;
	readonly colors:
		| {
				readonly background: '#000000';
				readonly surface: '#1a1a1a';
				readonly elevated: '#242424';
				readonly overlay: 'rgba(0, 0, 0, 0.8)';
				readonly border: '#383838';
				readonly divider: '#2a2a2a';
				readonly input: {
					readonly background: '#1f1f1f';
					readonly border: '#383838';
					readonly text: '#f3f4f6';
					readonly placeholder: '#6b7280';
				};
				readonly text: {
					readonly primary: '#f3f4f6';
					readonly secondary: '#d1d5db';
					readonly tertiary: '#9ca3af';
					readonly disabled: '#6b7280';
					readonly inverse: '#000000';
				};
				readonly primary: {
					readonly default: '#818cf8';
					readonly hover: '#a5b4fc';
					readonly active: '#6366f1';
					readonly light: '#c7d2fe';
					readonly dark: '#4f46e5';
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: '#a78bfa';
					readonly light: '#c4b5fd';
					readonly dark: '#8b5cf6';
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#f59e0b';
				readonly error: '#ef4444';
				readonly info: '#3b82f6';
				readonly favorite: '#ef4444';
				readonly like: '#ef4444';
				readonly tag: '#818cf8';
				readonly skeleton: '#2a2a2a';
				readonly shimmer: '#383838';
		  }
		| {
				readonly background: '#ffffff';
				readonly surface: '#f9fafb';
				readonly elevated: '#ffffff';
				readonly overlay: 'rgba(0, 0, 0, 0.5)';
				readonly border: '#e5e7eb';
				readonly divider: '#f3f4f6';
				readonly input: {
					readonly background: '#ffffff';
					readonly border: '#d1d5db';
					readonly text: '#111827';
					readonly placeholder: '#9ca3af';
				};
				readonly text: {
					readonly primary: '#111827';
					readonly secondary: '#374151';
					readonly tertiary: '#6b7280';
					readonly disabled: '#9ca3af';
					readonly inverse: '#ffffff';
				};
				readonly primary: {
					readonly default: '#6366f1';
					readonly hover: '#4f46e5';
					readonly active: '#4338ca';
					readonly light: '#818cf8';
					readonly dark: '#3730a3';
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: '#8b5cf6';
					readonly light: '#a78bfa';
					readonly dark: '#7c3aed';
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#f59e0b';
				readonly error: '#ef4444';
				readonly info: '#3b82f6';
				readonly favorite: '#ef4444';
				readonly like: '#ef4444';
				readonly tag: '#6366f1';
				readonly skeleton: '#e5e7eb';
				readonly shimmer: '#f3f4f6';
		  }
		| {
				readonly background: '#0a0a0a';
				readonly surface: '#1f1410';
				readonly elevated: '#2a1f1a';
				readonly border: '#3d2f28';
				readonly divider: '#2a1f1a';
				readonly input: {
					readonly background: '#1a1410';
					readonly border: '#3d2f28';
					readonly text: '#fef3c7';
					readonly placeholder: '#92400e';
				};
				readonly text: {
					readonly primary: '#fef3c7';
					readonly secondary: '#fcd34d';
					readonly tertiary: '#f59e0b';
					readonly disabled: '#92400e';
					readonly inverse: '#0a0a0a';
				};
				readonly primary: {
					readonly default: '#fb923c';
					readonly hover: '#fdba74';
					readonly active: '#f97316';
					readonly light: '#fed7aa';
					readonly dark: '#ea580c';
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: '#f472b6';
					readonly light: '#f9a8d4';
					readonly dark: '#ec4899';
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#fbbf24';
				readonly error: '#f43f5e';
				readonly info: '#60a5fa';
				readonly favorite: '#f43f5e';
				readonly like: '#f43f5e';
				readonly tag: '#fb923c';
				readonly skeleton: '#2a1f1a';
				readonly shimmer: '#3d2f28';
				readonly overlay: 'rgba(0, 0, 0, 0.8)';
		  }
		| {
				readonly background: string;
				readonly surface: string;
				readonly elevated: string;
				readonly border: string;
				readonly divider: string;
				readonly input: {
					readonly background: string;
					readonly border: string;
					readonly text: '#e0f2fe';
					readonly placeholder: '#0c4a6e';
				};
				readonly text: {
					readonly primary: '#e0f2fe';
					readonly secondary: '#7dd3fc';
					readonly tertiary: '#38bdf8';
					readonly disabled: '#0c4a6e';
					readonly inverse: string;
				};
				readonly primary: {
					readonly default: string;
					readonly hover: string;
					readonly active: string;
					readonly light: string;
					readonly dark: string;
					readonly contrast: '#ffffff';
				};
				readonly secondary: {
					readonly default: string;
					readonly light: string;
					readonly dark: string;
					readonly contrast: '#ffffff';
				};
				readonly success: '#10b981';
				readonly warning: '#fbbf24';
				readonly error: '#f43f5e';
				readonly info: '#0ea5e9';
				readonly favorite: '#f43f5e';
				readonly like: '#f43f5e';
				readonly tag: string;
				readonly skeleton: string;
				readonly shimmer: string;
				readonly overlay: 'rgba(0, 0, 0, 0.8)';
		  };
	readonly spacing: {
		readonly 0: 0;
		readonly 1: 4;
		readonly 2: 8;
		readonly 3: 12;
		readonly 4: 16;
		readonly 5: 20;
		readonly 6: 24;
		readonly 7: 28;
		readonly 8: 32;
		readonly 9: 36;
		readonly 10: 40;
		readonly 11: 44;
		readonly 12: 48;
		readonly 14: 56;
		readonly 16: 64;
		readonly 20: 80;
		readonly 24: 96;
		readonly 28: 112;
		readonly 32: 128;
	};
	readonly borderRadius: {
		readonly none: 0;
		readonly sm: 4;
		readonly DEFAULT: 8;
		readonly md: 8;
		readonly lg: 12;
		readonly xl: 16;
		readonly '2xl': 24;
		readonly '3xl': 32;
		readonly full: 9999;
	};
	readonly fontSize: {
		readonly xs: 12;
		readonly sm: 14;
		readonly base: 16;
		readonly lg: 18;
		readonly xl: 20;
		readonly '2xl': 24;
		readonly '3xl': 30;
		readonly '4xl': 36;
		readonly '5xl': 48;
		readonly '6xl': 60;
		readonly '7xl': 72;
		readonly '8xl': 96;
	};
	readonly fontWeight: {
		readonly regular: '400';
		readonly medium: '500';
		readonly semibold: '600';
		readonly bold: '700';
	};
	readonly shadows:
		| {
				readonly sm: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 1;
					};
					readonly shadowOpacity: 0.2;
					readonly shadowRadius: 2;
					readonly elevation: 2;
				};
				readonly md: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 4;
					};
					readonly shadowOpacity: 0.3;
					readonly shadowRadius: 6;
					readonly elevation: 4;
				};
				readonly lg: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 10;
					};
					readonly shadowOpacity: 0.4;
					readonly shadowRadius: 15;
					readonly elevation: 8;
				};
		  }
		| {
				readonly sm: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 1;
					};
					readonly shadowOpacity: 0.1;
					readonly shadowRadius: 2;
					readonly elevation: 2;
				};
				readonly md: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 4;
					};
					readonly shadowOpacity: 0.15;
					readonly shadowRadius: 6;
					readonly elevation: 4;
				};
				readonly lg: {
					readonly shadowColor: '#000';
					readonly shadowOffset: {
						readonly width: 0;
						readonly height: 10;
					};
					readonly shadowOpacity: 0.2;
					readonly shadowRadius: 15;
					readonly elevation: 8;
				};
		  };
	readonly opacity: {
		readonly disabled: 0.5;
		readonly overlay: 0.8;
		readonly hover: 0.9;
		readonly pressed: 0.7;
	};
};
/**
 * Get all available theme variants
 */
declare function getThemeVariants(): ThemeVariant[];
/**
 * Check if a theme variant exists
 */
declare function isValidThemeVariant(variant: string): variant is ThemeVariant;
/**
 * Type exports
 */
type NativeTheme = ReturnType<typeof createNativeTheme>;

export {
	type ColorMode,
	type NativeTheme,
	type SemanticColors,
	type ThemeVariant,
	createNativeTheme,
	getThemeColors,
	getThemeVariants,
	isValidThemeVariant,
};
