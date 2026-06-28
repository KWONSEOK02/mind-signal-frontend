'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import { sessionApi } from '@/07-shared/api';

interface AdminForcePairModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairingToken: string | null;
  theme: 'light' | 'dark';
}

const REQUEST_TIMEOUT_MS = 8000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AdminForcePairModal: React.FC<AdminForcePairModalProps> = ({
  isOpen,
  onClose,
  pairingToken,
  theme,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  // AbortController — modal close 시 in-flight forcePairing abort 처리함
  const abortRef = useRef<AbortController | null>(null);

  // close 시 abort + state 초기화 보장함 (race condition 차단)
  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return;
    }
    const t = setTimeout(() => setIsVisible(true), 10);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
      abortRef.current = null;
      setEmail('');
      setError('');
      setIsLoading(false);
      setIsVisible(false);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingToken) return;
    // FE 정규화 — BE Zod `.trim()`과 UX 정합 보장함
    const normalizedEmail = email.trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('이메일 형식 확인 필요함.');
      return;
    }
    // 신규 AbortController per submit — 직전 in-flight abort 후 새 컨트롤러 생성함
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError('');
    try {
      await sessionApi.forcePairing(pairingToken, normalizedEmail, {
        signal: controller.signal,
        timeout: REQUEST_TIMEOUT_MS,
      });
      onClose();
    } catch (err: unknown) {
      // abort 된 경우 stale response 무시 처리함
      if (controller.signal.aborted) return;
      if (axios.isCancel(err)) return;
      if (!axios.isAxiosError(err)) {
        setError('알 수 없는 오류 발생함.');
        return;
      }
      const axiosError = err as AxiosError<{ message?: string }>;
      if (axiosError.code === 'ECONNABORTED') {
        setError('요청 시간 초과 — 다시 시도 필요함.');
        return;
      }
      const status = axiosError.response?.status;
      // BE AppError 메시지를 우선 표시함 — 400을 무조건 '이메일 형식'으로 오매핑하지 않음
      // (예: 이미 PAIRED된 세션 재페어링 시 '현재 세션 상태(PAIRED)에서는...' 그대로 노출)
      const beMessage = axiosError.response?.data?.message;
      switch (status) {
        case 401:
          setError(beMessage ?? '재로그인 후 다시 시도 필요함.');
          break;
        case 403:
          setError(beMessage ?? '관리자 권한이 필요함.');
          break;
        case 404:
          setError(beMessage ?? '대상 사용자 또는 토큰 불일치 발생함.');
          break;
        case 400:
          setError(beMessage ?? '이메일 형식 확인 필요함.');
          break;
        default:
          // network down (response=undefined) + 5xx 모두 default 분기 처리함
          setError(beMessage ?? '요청 처리 실패함. 다시 시도 필요함.');
      }
    } finally {
      // abort 후 stale finally가 새 state 덮어쓰지 않도록 가드 처리함
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const inputStyle = `w-full p-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 ${
    theme === 'dark'
      ? 'border-white/10 bg-white/5 text-white'
      : 'border-slate-300 bg-white text-slate-900'
  }`;

  return (
    <div
      role="dialog"
      aria-label="Admin dev mode"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-150 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ height: '100dvh' }}
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md max-h-[calc(100dvh-32px)] overflow-y-auto rounded-3xl border shadow-2xl ${
          theme === 'dark'
            ? 'bg-slate-900 text-white border-white/10'
            : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        <div className="p-8 space-y-6">
          <header className="space-y-3">
            <span className="inline-block bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Admin dev mode
            </span>
            <h2 className="text-2xl font-black tracking-tight">강제 페어링</h2>
            <p
              className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}
            >
              대상 사용자 이메일 입력으로 현재 세션에 강제 연결 수행함.
            </p>
          </header>

          {error ? (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
            >
              {error}
            </div>
          ) : null}

          {!pairingToken ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
              세션 토큰을 찾을 수 없음. QR 생성 후 재시도 필요함.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* noValidate: HTML5 native validation 비활성, 수동 정규식 검증 일관성 보장함 */}
            <input
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyle}
              disabled={isLoading}
              aria-invalid={error ? 'true' : 'false'}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={`flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={isLoading || !pairingToken}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? '처리 중...' : '강제 페어링'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminForcePairModal;
