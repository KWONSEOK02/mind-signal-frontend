import { OAUTH_CONFIG, OAuthProvider } from '@/07-shared/constants/oauth';
import { isKakaoSdkReady } from './kakao-sdk';

// base64url 인코딩 수행함
function base64UrlEncode(buffer: Uint8Array): string {
  const str = btoa(String.fromCharCode(...buffer));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// code_verifier 생성함 (43-128자 URL-safe 랜덤 문자열)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// code_challenge 생성함 (SHA-256 해시 → base64url)
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

// 인앱 브라우저(카카오톡, 인스타그램 등) 여부 판별함
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || '';
  return /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN|Line|twitter/i.test(ua);
}

// 카카오톡 인앱 브라우저 여부 판별함
export function isKakaoInAppBrowser(): boolean {
  return /KAKAOTALK/i.test(navigator.userAgent || '');
}

/**
 * OAuth 제공자 인증 페이지로 리다이렉트 수행
 * redirect_uri는 클라이언트 실행 시점에 window.location.origin으로 동적 계산함
 */
export async function redirectToOAuth(provider: OAuthProvider): Promise<void> {
  const providerConfig = OAUTH_CONFIG[provider];

  // 콜백 URL 동적 생성
  const redirectUri = `${window.location.origin}/auth/callback`;

  // PKCE code_verifier 및 code_challenge 생성함
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // state nonce 생성함
  const state = crypto.randomUUID();

  // PKCE 및 state 정보 sessionStorage에 저장함 (redirectUri 포함)
  sessionStorage.setItem(
    'oauth_state',
    JSON.stringify({ provider, codeVerifier, state, redirectUri })
  );

  // OAuth 쿼리 파라미터 빌드
  const params = new URLSearchParams({
    client_id: providerConfig.clientId,
    redirect_uri: redirectUri,
    response_type: providerConfig.responseType,
    scope: providerConfig.scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const oauthUrl = `${providerConfig.authUrl}?${params.toString()}`;

  if (isInAppBrowser()) {
    // 인앱 브라우저에서는 sessionStorage가 새 탭과 공유되지 않으므로 localStorage에도 백업 저장함
    localStorage.setItem(
      'oauth_state_backup',
      JSON.stringify({ provider, codeVerifier, state, redirectUri })
    );

    // 시스템 브라우저 우선, 불가 시 새 탭으로 폴백함
    const opened = window.open(oauthUrl, '_system');
    if (!opened) {
      window.open(oauthUrl, '_blank');
    }
  } else {
    window.location.href = oauthUrl;
  }
}

// Kakao JS SDK를 통한 로그인 수행함 (모바일 카카오톡 앱 전환 자동 처리)
export async function redirectToKakaoWithSdk(
  redirectUri?: string
): Promise<void> {
  if (!isKakaoSdkReady()) {
    // SDK 미초기화 시 raw OAuth로 폴백함
    await redirectToOAuth('kakao');
    return;
  }

  const callbackUri = redirectUri || `${window.location.origin}/auth/callback`;
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();

  // PKCE code_challenge 생성함
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem(
    'oauth_state',
    JSON.stringify({
      provider: 'kakao',
      codeVerifier,
      state,
      redirectUri: callbackUri,
    })
  );

  window.Kakao!.Auth.authorize({
    redirectUri: callbackUri,
    scope: 'profile_nickname,account_email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
}
