import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint の設定。
 *
 * 型チェック（tsc）が「型の誤り」を見つけるのに対し、ESLint は「型は合っているが危うい書き方」を
 * 見つけます。型情報を使うルール（TypeChecked）を有効にしているので、await の付け忘れや
 * any の伝播なども検出できます。
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/',
      '**/coverage/',
      '**/.wrangler/',
      '**/.vitest/',
      '**/.generated/',
      'apps/api/migrations/',
      'playwright-report/',
      'test-results/',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        // 各ファイルに最も近い tsconfig.json を自動で探して型情報を取得します。
        projectService: {
          // どの tsconfig.json の include にも入らない設定ファイルは、既定の設定で解析します。
          allowDefaultProject: ['playwright.config.ts', 'apps/web/vite.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // このプロジェクトでは interface ではなく type に統一しています。
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // 型だけの import には `import type` を使います（出力から確実に消すため）。
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      // テンプレートリテラルに数値を埋め込むのは許可します。
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `_` で始まる引数は「意図的に使っていない」印として許可します。
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // `() => setValue(x)` のような短い書き方を許可します。
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // onClick などに async 関数を直接渡すのは React では一般的なので、属性では許可します。
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      // フックの規則に加え、React Compiler が前提とする書き方（描画中に値を書き換えない、
      // 描画中に setState しない など）を検査するルール一式を有効にします。
      ...reactHooks.configs['recommended-latest'].rules,
      'react-hooks/exhaustive-deps': 'error',
    },
  },

  {
    // テストでは、わざと不正な値を作るための型アサーションなどを許可します。
    files: ['**/*.test.{ts,tsx}', '**/*.test-d.ts', '**/test/**', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
);
