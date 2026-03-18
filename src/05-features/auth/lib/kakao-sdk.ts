import { config } from '@/07-shared/config/config';

// Kakao JS SDK 초기화 상태 관리
let initialized = false;
// 스크립트 로드 진행 중 여부 (중복 삽입 방지용 플래그)
let loading = false;

// Kakao JS SDK 스크립트 로드 및 초기화 수행함
export function initKakaoSdk(): void {
  if (typeof window === 'undefined') return;
  if (initialized || window.Kakao?.isInitialized()) {
    initialized = true;
    return;
  }

  const jsKey = config.kakao.jsKey;
  if (!jsKey) return;

  // SDK 스크립트가 이미 로드된 경우 초기화만 수행함
  if (window.Kakao) {
    window.Kakao.init(jsKey);
    initialized = true;
    return;
  }

  // 스크립트 로드 중이면 중복 삽입 방지함
  if (loading) return;
  loading = true;

  // SDK 스크립트 동적 로드함
  const script = document.createElement('script');
  script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
  script.async = true;
  script.onload = () => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(jsKey);
      initialized = true;
    }
  };
  document.head.appendChild(script);
}

// Kakao SDK 초기화 여부 반환함
export function isKakaoSdkReady(): boolean {
  return typeof window !== 'undefined' && !!window.Kakao?.isInitialized();
}
