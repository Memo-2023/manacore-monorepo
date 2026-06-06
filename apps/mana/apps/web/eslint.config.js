// @ts-check
import { baseConfig, typescriptConfig, svelteConfig, prettierConfig } from '@mana/eslint-config';

export default [
	{
		ignores: ['dist/**', '.svelte-kit/**', 'node_modules/**'],
	},
	...baseConfig,
	...typescriptConfig,
	...svelteConfig,
	...prettierConfig,
	// The unified app is huge; type-aware `projectService` linting builds the
	// full TS program (~45 min in CI) for ZERO benefit here — the shared config
	// enables only syntactic rules (tseslint `recommended`, not
	// `recommendedTypeChecked`), and type errors are caught by the dedicated
	// `svelte-check` "Type check" step. Turn projectService off so lint is fast.
	{
		files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: { projectService: false },
		},
	},
	// Guard: prevent raw liveQuery imports in module code. All modules
	// must use useLiveQueryWithDefault from @mana/local-store/svelte
	// instead, which provides a reactive { value, loading, error } shape.
	// Raw liveQuery returns an Observable that requires manual .subscribe()
	// boilerplate and was the root cause of 38 type errors.
	{
		files: ['src/lib/modules/**/queries.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'dexie',
							importNames: ['liveQuery'],
							message:
								'Use useLiveQueryWithDefault from @mana/local-store/svelte instead of raw liveQuery. See the Observable migration commit for rationale.',
						},
					],
				},
			],
		},
	},
];
