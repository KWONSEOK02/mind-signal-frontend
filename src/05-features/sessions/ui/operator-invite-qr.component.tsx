'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Timer, AlertTriangle, X } from 'lucide-react';
import { createOperatorInviteToken } from '@/07-shared/api/session';
import { config } from '@/07-shared/config/config';

/**
 * OperatorInviteQr 컴포넌트 props 정의함
 */
interface OperatorInviteQrProps {
  /** 그룹 식별자 — QR 코드 URL 생성에 사용함 */
  groupId: string;
  /** 테마 (다크/라이트 모드) */
  isDark?: boolean;
  /** 닫기 버튼 클릭 핸들러 */
  onClose?: () => void;
}

/** 초대 토큰 만료 시간 (5분 = 300초) */
const INVITE_TIMEOUT_SECONDS = 300;

/**
 * [Feature] Operator 초대 QR 컴포넌트 정의함 (Phase 16 FE-1 본 구현)
 *
 * createOperatorInviteToken(groupId) 호출 후 QR 생성함
 * QR URL: {config.api.baseUrl 앞부분}/lab/operator-join?token={token}&groupId={groupId}
 * 5분 만료 타이머 표시함 (PLAN L178-180)
 * 만료 또는 발급 실패 시 재발급 버튼 표시함
 */
export function OperatorInviteQr({
  groupId,
  isDark = true,
  onClose,
}: OperatorInviteQrProps) {
  const [token, setToken] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(INVITE_TIMEOUT_SECONDS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * QR 기반 URL 구성함
   * config.api.baseUrl 은 '/api' suffix 포함이므로 origin만 추출함
   */
  const buildQrUrl = useCallback(
    (t: string) => {
      // baseUrl 예: https://example.com/api → origin: https://example.com
      const origin = config.api.baseUrl.replace(/\/api$/, '');
      return `${origin}/lab/operator-join?token=${t}&groupId=${groupId}`;
    },
    [groupId]
  );

  /**
   * 초대 토큰 발급 및 QR 생성 처리함
   */
  const issueToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setToken(null);
    setQrUrl(null);
    setTimeLeft(INVITE_TIMEOUT_SECONDS);

    try {
      const result = await createOperatorInviteToken(groupId);
      setToken(result.token);
      setQrUrl(buildQrUrl(result.token));
    } catch (err) {
      console.error('초대 토큰 발급 실패함:', err);
      setError('초대 토큰 발급에 실패함. 재시도 바람.');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, buildQrUrl]);

  // 컴포넌트 마운트 시 초기 토큰 발급함
  useEffect(() => {
    void issueToken();
  }, [issueToken]);

  // 5분 카운트다운 타이머 처리함
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [token]);

  const isExpiringSoon = timeLeft < 60;
  const isExpired = timeLeft === 0;

  return (
    <div
      className={`relative flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border w-full max-w-xs mx-auto transition-all ${
        isDark
          ? 'bg-indigo-500/5 border-indigo-500/20'
          : 'bg-white/80 border-indigo-100 shadow-sm'
      }`}
    >
      {/* 닫기 버튼 */}
      {onClose ? (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white transition-colors"
          aria-label="QR 닫기"
        >
          <X size={18} />
        </button>
      ) : null}

      <p
        className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
      >
        파트너 PC 초대 QR
      </p>

      {/* 로딩 상태 */}
      {isLoading ? (
        <div className="w-[240px] h-[240px] flex items-center justify-center">
          <RefreshCw size={32} className="text-indigo-500 animate-spin" />
        </div>
      ) : null}

      {/* 에러 상태 */}
      {!isLoading && error ? (
        <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      ) : null}

      {/* QR 코드 표시 */}
      {!isLoading && qrUrl && !error ? (
        <div className="p-3 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 ring-4 ring-slate-900/60">
          <QRCodeSVG value={qrUrl} size={240} level="H" includeMargin={true} />
        </div>
      ) : null}

      {/* 타이머 + 만료 경고 */}
      {!isLoading && token ? (
        <div
          className={`flex items-center gap-1.5 font-mono text-lg font-black tracking-tighter ${
            isExpiringSoon || isExpired
              ? 'text-red-500 animate-pulse'
              : 'text-indigo-500'
          }`}
        >
          {isExpiringSoon || isExpired ? (
            <AlertTriangle size={16} />
          ) : (
            <Timer size={16} />
          )}
          <span>
            {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      ) : null}

      <p
        className={`text-[11px] font-bold text-center leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
      >
        파트너 PC에서 QR을 스캔하여 합류함
        <br />
        <span className="opacity-60">초대 링크는 5분간 유효함</span>
      </p>

      {/* 재발급 버튼 — 만료 / 에러 시 표시함 */}
      {isExpired || (error !== null && !isLoading) ? (
        <button
          onClick={() => void issueToken()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-[11px] transition-all active:scale-95 bg-indigo-600/90 hover:bg-indigo-500 text-white disabled:opacity-50"
        >
          <RefreshCw size={14} />새 코드 발급
        </button>
      ) : null}
    </div>
  );
}

export default OperatorInviteQr;
