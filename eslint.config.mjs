import next from '@next/eslint-plugin-next';
import parser from '@typescript-eslint/parser';

export default [
  { ignores: ['node_modules/**', '.next*/**', 'public/**', 'artifacts/**', 'qa/**'] },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' } },
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      // Canvas textures and photographic art direction use native image sizing.
      '@next/next/no-img-element': 'off',
    },
  },
];
