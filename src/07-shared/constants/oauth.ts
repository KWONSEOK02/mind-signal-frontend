/**
 * OAuth 제공자별 인증 설정 상수 정의
 * window.location.origin은 모듈 레벨에서 사용 불가 (SSR 비호환)이므로
 * redirect_uri는 리다이렉트 함수 내부에서 동적으로 계산함
 */
import { config } from '@/07-shared/config/config';

export const OAUTH_CONFIG = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientId: config.google.clientId,
    scope: 'email profile',
    responseType: 'code',
  },
  kakao: {
    authUrl: 'https://kauth.kakao.com/oauth/authorize',
    clientId: config.kakao.clientId,
    scope: 'profile_nickname,account_email',
    responseType: 'code',
  },
} as const;

export type OAuthProvider = keyof typeof OAUTH_CONFIG;
