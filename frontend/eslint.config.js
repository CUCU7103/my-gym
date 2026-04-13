// ESLint 설정 파일 - Flat Config 형식
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // 빌드 결과물 디렉토리 제외
  { ignores: ['dist'] },
  {
    // JavaScript 권장 규칙 + TypeScript 권장 규칙 확장
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    // TypeScript 및 TSX 파일에 적용
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks 권장 규칙 적용
      ...reactHooks.configs.recommended.rules,
      // Fast Refresh 호환성 경고 (상수 내보내기는 허용)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
)
