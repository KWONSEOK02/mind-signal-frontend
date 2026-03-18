'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/07-shared/api';
import { useUI } from '@/app/providers/ui-context';

/**
 * OAuth 콜백 처리 내부 컴포넌트
 * useSearchParams 훅 사용으로 반드시 Suspense 경계 내부에서 렌더링해야 함
 */
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useUI();

  useEffect(() => {
    // 쿼리 파라미터에서 인가 코드 및 state nonce 추출
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');

    // sessionStorage에서 저장된 OAuth state 정보 읽기 (인앱 브라우저 폴백: localStorage 백업 조회)
    const storedRaw =
      sessionStorage.getItem('oauth_state') ||
      localStorage.getItem('oauth_state_backup');
    // 사용 완료 후 즉시 제거함
    sessionStorage.removeItem('oauth_state');
    localStorage.removeItem('oauth_state_backup');

    if (!code || !stateParam || !storedRaw) {
      // 필수 파라미터 누락 시 에러 페이지로 이동
      router.replace('/?auth_error=social_login_failed');
      return;
    }

    let storedState: {
      provider: string;
      codeVerifier: string;
      state: string;
      redirectUri?: string;
    };
    try {
      // sessionStorage JSON 파싱 처리
      storedState = JSON.parse(storedRaw);
    } catch {
      // JSON 파싱 실패 시 에러 페이지로 이동
      router.replace('/?auth_error=social_login_failed');
      return;
    }

    // state nonce 검증 완료 — 불일치 시 CSRF 공격으로 간주함
    if (stateParam !== storedState.state) {
      router.replace('/?auth_error=social_login_failed');
      return;
    }

    const { provider, codeVerifier } = storedState;

    const handleSocialLogin = async () => {
      try {
        // 소셜 로그인 API 호출 (codeVerifier, redirectUri 포함)
        const { data } = await authApi.socialLogin(
          provider,
          code,
          codeVerifier,
          storedState.redirectUri
        );

        if (data.token) {
          // 토큰 로컬 스토리지 저장 및 사용자 정보 갱신
          localStorage.setItem('token', data.token);
          await refreshUser();
          router.replace('/');
        } else {
          router.replace('/?auth_error=social_login_failed');
        }
      } catch {
        // 소셜 로그인 실패 시 에러 파라미터와 함께 홈으로 이동
        router.replace('/?auth_error=social_login_failed');
      }
    };

    handleSocialLogin();
  }, [searchParams, router, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg font-bold">로그인 처리 중...</p>
      </div>
    </div>
  );
}

/**
 * OAuth 콜백 페이지
 * Suspense 경계로 OAuthCallbackContent를 감싸 useSearchParams SSR 안전성 확보함
 */
export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg font-bold">로그인 처리 중...</p>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
