import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // FSD 구조의 모든 파일을 스캔함
  ],
  theme: {
    extend: {
      // 1. 애니메이션 핵심 동작(Keyframes) 정의함
      keyframes: {
        "scan-line": {
          "0%": { top: "0%", opacity: "0.2" },
          "50%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0.2" },
        },
      },
      // 2. 클래스명으로 사용할 애니메이션 설정함
      animation: {
        "scan-line": "scan-line 2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;