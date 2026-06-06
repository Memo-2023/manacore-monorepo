// @ts-check
import { baseConfig, typescriptConfig, prettierConfig } from '@mana/eslint-config';

export default [
	{
		ignores: ['dist/**', 'node_modules/**'],
	},
	...baseConfig,
	...typescriptConfig,
	...prettierConfig,
];
