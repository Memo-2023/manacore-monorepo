// @ts-check
import { baseConfig, typescriptConfig, svelteConfig, prettierConfig } from '@mana/eslint-config';
import tseslint from 'typescript-eslint';

export default [
	{
		ignores: ['dist/**', '.svelte-kit/**', 'node_modules/**'],
	},
	...baseConfig,
	...typescriptConfig,
	...svelteConfig,
	...prettierConfig,
	{
		// Svelte 5 rune modules (*.svelte.ts/.js) are matched by both the shared
		// `**/*.ts` block (which sets the TS parser + parserOptions) and the shared
		// svelte block (which sets the svelte parser but no parserOptions). Flat
		// config merges languageOptions key-by-key, so these files end up using the
		// svelte parser with the TS block's parserOptions — which lack the
		// `parser: tseslint.parser` sub-parser svelte-eslint-parser needs to read
		// TypeScript, producing a spurious "Unexpected token {" parse error.
		// Re-supply the sub-parser so rune modules parse as TS.
		files: ['**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	},
];
