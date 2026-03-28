// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // MSW 자동 생성 파일
    "public/mockServiceWorker.js",
  ]),
  ...storybook.configs["flat/recommended"],

  /**
   * [Override] 스토리 파일 전용 린트 예외 규칙 정의함
   * Vitest 브라우저 모드 호환성을 위해 @storybook/react 직접 임포트 허용함
   */
  {
    files: ["**/*.stories.{ts,tsx,mdx}"],
    rules: {
      // 프레임워크 패키지 대신 렌더러 패키지 직접 사용 허용함
      "storybook/no-renderer-packages": "off",
      // 버전 충돌 방지를 위해 개별 테스팅 라이브러리 사용 허용함
      "storybook/use-storybook-testing-library": "off",
      "storybook/use-storybook-expect": "off",
    },
  },
]);

export default eslintConfig;