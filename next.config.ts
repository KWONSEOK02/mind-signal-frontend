import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // AGENTS.md 2.1 규칙에 명시된 패키지 임포트 최적화 설정 사용함
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'framerusercontent.com',
        port: '',
        pathname: '/**', // 모든 경로의 이미지를 허용
      },
    ],
  },
};

export default nextConfig;