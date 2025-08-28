import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/App.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: './components/ErdViewer', message: 'App에서는 ErdViewer만 가져오세요.' },
          { name: './lib/api', message: 'App에서는 api의 공개 함수만 사용하세요.' },
          { name: './lib/exporters', message: 'App에서는 exporters 공개 함수만 사용하세요.' },
        ],
        patterns: [
          './lib/*/*',
          '../lib/*/*',
        ],
      }],
    },
  },
  {
    files: ['src/components/ErdViewer.tsx'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
])
