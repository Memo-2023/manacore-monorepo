/**
 * TypeScript ESLint configuration
 *
 * Provides type-aware linting rules for TypeScript projects.
 * Uses projectService for automatic tsconfig detection in monorepos.
 *
 * Strictness balance:
 * - ERROR: Unused variables, unsafe operations
 * - WARN: Explicit any (allow during migration), return types
 * - OFF: Rules that conflict with TypeScript's own checks
 */
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export const typescriptConfig = [
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module',
				// `allowDefaultProject` lets type-aware linting fall back to an
				// inferred program for files a package intentionally keeps out of
				// its tsconfig (config files, specs, svelte-adapter entries).
				// Without it those fail "not found by the project service".
				// tsconfigRootDir is intentionally NOT pinned — it defaults to
				// process.cwd() (the package being linted); pinning it to
				// import.meta.dirname pointed every consumer at the eslint-config
				// package and broke project discovery.
				projectService: {
					allowDefaultProject: [
						'*.config.ts',
						'*.config.js',
						'*.config.mjs',
						'*.config.cjs',
						'*.spec.ts',
						'*.test.ts',
						'src/svelte/index.ts',
					],
				},
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			// ============================================
			// ERRORS - Type safety violations
			// ============================================

			// Unused code must be removed
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					ignoreRestSiblings: true,
				},
			],

			// Enforce proper typing
			'@typescript-eslint/no-non-null-assertion': 'warn',

			// ============================================
			// WARNINGS - Best practices, fix when convenient
			// ============================================

			// Allow any during migration, but flag it
			'@typescript-eslint/no-explicit-any': 'warn',

			// Encourage type annotations on exports
			'@typescript-eslint/explicit-function-return-type': 'off', // Too verbose
			'@typescript-eslint/explicit-module-boundary-types': 'off', // Too verbose

			// Prefer modern patterns
			'@typescript-eslint/prefer-as-const': 'warn',
			'@typescript-eslint/no-inferrable-types': 'warn',
			// Disabled: requires type-aware linting which conflicts with svelte-eslint-parser
			// for .svelte.ts files. Can be re-enabled with parser-specific scoping.
			'@typescript-eslint/consistent-type-imports': 'off',

			// ============================================
			// OFF - Too strict or handled elsewhere
			// ============================================

			// Allow empty functions (common in interfaces/defaults)
			'@typescript-eslint/no-empty-function': 'off',

			// Allow require() for dynamic imports
			'@typescript-eslint/no-require-imports': 'off',

			// Allow namespace for declaration merging
			'@typescript-eslint/no-namespace': 'off',

			// Base rule must be off when using TS version
			'no-unused-vars': 'off',

			// Allow this aliasing in some patterns (e.g., closures)
			'@typescript-eslint/no-this-alias': 'warn',
		},
	},
];

export default typescriptConfig;
