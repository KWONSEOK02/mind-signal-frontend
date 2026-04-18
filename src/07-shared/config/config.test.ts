import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * config.ts 환경 변수 파싱 및 설정 객체 검증 테스트
 *
 * 주의: Vite의 `define: { 'process.env': {} }` 설정으로 인해
 * 빌드 시점에 process.env 참조가 빈 객체로 치환됨.
 * 따라서 모듈 레벨 process.env 모킹이 불가하므로:
 * - 기본값 및 config 객체 형태 검증 → 실제 모듈 import 사용
 * - 커스텀 값/유효성 검사 → Zod 스키마 직접 테스트 수행
 */

/**
 * 실제 모듈과 동일한 envSchema 재선언 (스키마 로직 직접 검증용)
 */
const envSchema = z.object({
  NEXT_PUBLIC_NODE_ENV: z
    .enum(['local', 'development', 'test', 'production'])
    .default('local'),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default('https://mind-signal-backend-74ab2db9e087.herokuapp.com'),
  NEXT_PUBLIC_PAIRING_TIMEOUT: z
    .string()
    .default('300')
    .transform(Number)
    .refine((n) => Number.isInteger(n) && n > 0, {
      message: 'NEXT_PUBLIC_PAIRING_TIMEOUT must be a positive integer',
    }),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional().default(''),
  NEXT_PUBLIC_KAKAO_CLIENT_ID: z.string().optional().default(''),
  NEXT_PUBLIC_KAKAO_JS_KEY: z.string().optional().default(''),
});

describe('config', () => {
  describe('기본값 적용', () => {
    /**
     * Vite define으로 process.env가 {} 치환되므로 모든 값이 기본값으로 적용됨
     */
    it('환경 변수 미설정 시 NEXT_PUBLIC_NODE_ENV 기본값 local 적용됨', async () => {
      const { config } = await import('./config');
      expect(config.env).toBe('local');
    });

    it('환경 변수 미설정 시 NEXT_PUBLIC_API_URL 기본값 Heroku URL 적용됨', async () => {
      const { config } = await import('./config');
      expect(config.api.baseUrl).toBe(
        'https://mind-signal-backend-74ab2db9e087.herokuapp.com/api'
      );
    });

    it('환경 변수 미설정 시 NEXT_PUBLIC_PAIRING_TIMEOUT 기본값 300 적용됨', async () => {
      const { config } = await import('./config');
      expect(config.session.pairingTimeout).toBe(300);
    });

    it('환경 변수 미설정 시 expiryMs = pairingTimeout * 1000 계산됨', async () => {
      const { config } = await import('./config');
      expect(config.session.expiryMs).toBe(300 * 1000);
    });

    it('환경 변수 미설정 시 isProduction false 반환됨', async () => {
      const { config } = await import('./config');
      expect(config.isProduction).toBe(false);
    });

    it('환경 변수 미설정 시 isTest false 반환됨', async () => {
      const { config } = await import('./config');
      expect(config.isTest).toBe(false);
    });
  });

  describe('config 객체 형태 검증', () => {
    it('baseUrl이 API_URL에 /api suffix 포함됨', async () => {
      const { config } = await import('./config');
      expect(config.api.baseUrl).toMatch(/\/api$/);
    });

    it('expiryMs = pairingTimeout * 1000 변환됨', async () => {
      const { config } = await import('./config');
      expect(config.session.expiryMs).toBe(
        config.session.pairingTimeout * 1000
      );
    });

    it('metadata 기본값 Mind Signal 포함됨', async () => {
      const { config } = await import('./config');
      expect(config.metadata.title).toBe('Mind Signal');
      expect(config.metadata.description).toBe('뇌파 분석 및 매칭 서비스');
    });

    it('google/kakao 필드 빈 문자열 기본값 적용됨', async () => {
      const { config } = await import('./config');
      expect(config.google.clientId).toBe('');
      expect(config.kakao.clientId).toBe('');
      expect(config.kakao.jsKey).toBe('');
    });
  });

  describe('envSchema — 유효한 커스텀 값 파싱', () => {
    it('모든 환경 변수 유효 설정 시 파싱 성공 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
        NEXT_PUBLIC_PAIRING_TIMEOUT: '600',
        NEXT_PUBLIC_SOCKET_URL: 'https://socket.example.com',
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'google-client-id',
        NEXT_PUBLIC_KAKAO_CLIENT_ID: 'kakao-client-id',
        NEXT_PUBLIC_KAKAO_JS_KEY: 'kakao-js-key',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_NODE_ENV).toBe('production');
        expect(result.data.NEXT_PUBLIC_API_URL).toBe('https://api.example.com');
        expect(result.data.NEXT_PUBLIC_SOCKET_URL).toBe(
          'https://socket.example.com'
        );
        expect(result.data.NEXT_PUBLIC_GOOGLE_CLIENT_ID).toBe(
          'google-client-id'
        );
      }
    });

    it('NODE_ENV development 유효 값 파싱 성공 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_NODE_ENV: 'development',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_NODE_ENV).toBe('development');
      }
    });

    it('SOCKET_URL 미설정 시 optional 허용 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_NODE_ENV: 'local',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_SOCKET_URL).toBeUndefined();
      }
    });
  });

  describe('envSchema — PAIRING_TIMEOUT 변환', () => {
    it('문자열 "600" 입력 시 숫자 600으로 변환됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_PAIRING_TIMEOUT: '600',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_PAIRING_TIMEOUT).toBe(600);
        expect(typeof result.data.NEXT_PUBLIC_PAIRING_TIMEOUT).toBe('number');
      }
    });

    it('문자열 "300" 입력 시 숫자 300으로 변환됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_PAIRING_TIMEOUT: '300',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_PAIRING_TIMEOUT).toBe(300);
      }
    });

    it('PAIRING_TIMEOUT 미입력 시 기본값 300 적용됨', () => {
      const result = envSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_PAIRING_TIMEOUT).toBe(300);
      }
    });
  });

  describe('envSchema — 유효하지 않은 환경 변수 파싱 실패', () => {
    it('유효하지 않은 API_URL 입력 시 파싱 실패 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_API_URL: 'not-a-valid-url',
      });

      expect(result.success).toBe(false);
    });

    it('유효하지 않은 NODE_ENV 입력 시 파싱 실패 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_NODE_ENV: 'staging',
      });

      expect(result.success).toBe(false);
    });

    it('유효하지 않은 SOCKET_URL 입력 시 파싱 실패 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_SOCKET_URL: 'not-a-url',
      });

      expect(result.success).toBe(false);
    });

    it('PAIRING_TIMEOUT 비숫자 "abc" 입력 시 파싱 실패 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_PAIRING_TIMEOUT: 'abc',
      });

      expect(result.success).toBe(false);
    });

    it('PAIRING_TIMEOUT "0" 입력 시 파싱 실패 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_PAIRING_TIMEOUT: '0',
      });

      expect(result.success).toBe(false);
    });

    it('PAIRING_TIMEOUT 음수 "-1" 입력 시 파싱 실패 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_PAIRING_TIMEOUT: '-1',
      });

      expect(result.success).toBe(false);
    });

    it('PAIRING_TIMEOUT 소수 "100.5" 입력 시 파싱 실패 처리됨', () => {
      const result = envSchema.safeParse({
        NEXT_PUBLIC_PAIRING_TIMEOUT: '100.5',
      });

      expect(result.success).toBe(false);
    });
  });
});
