// Kakao JS SDK 전역 타입 선언

interface KakaoAuth {
  authorize(settings: {
    redirectUri: string;
    scope?: string;
    state?: string;
    /** PKCE code_challenge 값 (SHA-256 해시 base64url 인코딩) */
    code_challenge?: string;
    /** PKCE code_challenge 생성 방식 (S256 고정) */
    code_challenge_method?: 'S256';
  }): void;
  login(settings: {
    scope?: string;
    success: (authObj: { access_token: string }) => void;
    fail: (err: Error) => void;
  }): void;
}

interface KakaoStatic {
  init(appKey: string): void;
  isInitialized(): boolean;
  Auth: KakaoAuth;
}

interface Window {
  Kakao?: KakaoStatic;
}
