import { z } from 'zod';

/**
 * @fileoverview 애플리케이션 전역 환경 변수 및 설정 관리
 * 07-shared 계층에서 관리함
 */

/**
 * 환경 변수 구조를 정의하는 Zod 스키마
 * 프로젝트 기술 스택인 Zod를 활용하여 데이터 무결성 보장함
 */
const envSchema = z.object({
  /** 구동 환경 (local, development, production 등) */
  NEXT_PUBLIC_NODE_ENV: z
    .enum(['local', 'development', 'test', 'production'])
    .default('local'),

  /** 백엔드 API 서버 주소 (Heroku 또는 로컬 서버) */
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default('https://mind-signal-backend-74ab2db9e087.herokuapp.com'),

  /** 페어링 세션 유효 시간 (초 단위, 기본 300초) */
  NEXT_PUBLIC_PAIRING_TIMEOUT: z.string().transform(Number).default(300),

  /** 소켓 서버 연결 주소 */
  NEXT_PUBLIC_SOCKET_URL: z.string().url().optional(),
});

/**
 * 런타임 환경 변수 검증 수행
 * 설정되지 않은 필수 변수가 있을 경우 에러를 발생시켜 안전한 구동 보장함
 */
const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_PAIRING_TIMEOUT: process.env.NEXT_PUBLIC_PAIRING_TIMEOUT,
  NEXT_PUBLIC_SOCKET_URL:
    process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL,
});

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Critical Error: 필수 환경 변수가 설정되지 않았습니다.');
}

const env = parsedEnv.data;

/**
 * 애플리케이션 통합 설정 객체
 * 내부 코드에서 환경 변수에 직접 접근하는 대신 이 객체를 통해 통일된 규격 사용함
 */
export const config = {
  env: env.NEXT_PUBLIC_NODE_ENV,
  isProduction: env.NEXT_PUBLIC_NODE_ENV === 'production',
  isTest: env.NEXT_PUBLIC_NODE_ENV === 'test',

  api: {
    baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
    socketUrl: env.NEXT_PUBLIC_SOCKET_URL,
  },

  session: {
    pairingTimeout: env.NEXT_PUBLIC_PAIRING_TIMEOUT,
    expiryMs: env.NEXT_PUBLIC_PAIRING_TIMEOUT * 1000,
  },

  /** 앱 메타데이터 설정 */
  metadata: {
    title: 'Mind Signal',
    description: '뇌파 분석 및 매칭 서비스',
  },
} as const;

export default config;
