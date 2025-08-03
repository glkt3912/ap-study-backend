import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // TypeScript推奨ルール
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // 一般的なルール
      'no-console': 'error',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // TypeScriptルールに任せる
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
      'curly': 'error',

      // セキュリティ関連
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // パフォーマンス関連
      'no-loop-func': 'error',
      'no-await-in-loop': 'warn',

      // コードの可読性
      'max-len': ['error', { code: 120, ignoreUrls: true }],
      'complexity': ['warn', 10],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      '*.config.js',
      '*.config.ts',
      'prisma/migrations/**',
    ],
  },
);