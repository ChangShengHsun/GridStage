import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      // Desktop build artifacts: the copied web bundle and packaged installers.
      'apps/desktop/renderer/**',
      'apps/desktop/release/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
    },
  },
  {
    // Config and script files at repo root don't need strict typing rules
    files: ['*.mjs', '*.js', '**/*.config.*'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    // Plain Node scripts (migration runner, demo generators…): JS, not TS, so
    // TS-only return-type annotations can't apply here.
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    // Service worker: its own global scope, not the window's. Plain JS, so
    // TS-only return-type annotations can't apply here.
    files: ['apps/web/public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    // Electron main process: CommonJS by design (Electron loads it directly).
    files: ['apps/desktop/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        setTimeout: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
