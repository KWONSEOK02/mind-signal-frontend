'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinAsOperator } from '@/07-shared/api/session';
import { AlertCircle, LogIn } from 'lucide-react';

const emptySubscribe = () => () => {};

/**
 * [Page] Operator가 초대 토큰으로 2PC 그룹에 합류하는 페이지 정의함
 *
 * URL: /lab/operator-join?token=XXX&groupId=XXX (PLAN 아키텍처 결정 #10)
 */
const OperatorJoinPage = () => {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query param 파싱 (PLAN L135 — token + groupId)
  const token = searchParams?.get('token') ?? null;
  const groupId = searchParams?.get('groupId') ?? null;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 합류 버튼 클릭 시 joinAsOperator API 호출 수행함
   * 성공 시 /lab?groupId={groupId}로 이동 (PLAN L138)
   * 실패 시 에러 메시지 표시함
   */
  const handleJoin = async () => {
    if (!token) {
      setError('유효하지 않은 초대 링크임. 토큰 정보가 없음.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await joinAsOperator(token);
      // 성공 시 운영자 대시보드로 이동 (PLAN L138)
      router.push(`/lab?groupId=${result.groupId}`);
    } catch (err: unknown) {
      // JWT decode 실패 / 만료 토큰 처리 (PLAN L139-140)
      const status =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response
          ? (err.response as { status: number }).status
          : null;

      if (status === 401 || status === 400) {
        // 만료 토큰 감지 — 재발급 요청 안내 (PLAN L139)
        setError(
          '초대 토큰이 만료되었거나 유효하지 않음. 운영자에게 새 초대 링크를 요청하기 바람.'
        );
      } else {
        setError('합류 요청 중 오류가 발생함. 잠시 후 다시 시도하기 바람.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 재발급 요청 버튼 클릭 시 알림 표시함 (PLAN L139)
   */
  const handleRequestNewInvite = () => {
    alert(
      '운영자에게 새 초대 링크를 요청하기 바람.\n초대 링크는 5분간 유효함.'
    );
  };

  // 토큰 없음 — JWT decode 실패 에러 UI (PLAN L140)
  const isTokenMissing = !token;

  if (!isClient) return <div className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 pt-24 pb-12 px-6">
      <div className="max-w-md mx-auto space-y-8">
        <header className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-2">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
            Operator <span className="text-indigo-500">Join</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            2PC 실험 그룹에 운영자로 합류함
            <br />
            초대 토큰이 유효한 동안 합류 가능함 (5분)
          </p>
        </header>

        <section className="space-y-6">
          {/* 토큰 정보 표시 */}
          {groupId ? (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs font-mono text-indigo-300 text-center">
                GROUP: {groupId}
              </p>
            </div>
          ) : null}

          {/* 에러 UI (PLAN L140 — JWT decode 실패 / 만료 토큰) */}
          {(error ?? isTokenMissing) ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">
                  {error ??
                    '유효하지 않은 초대 링크임. 초대 URL을 다시 확인하기 바람.'}
                </p>
              </div>
              {/* 만료 토큰 시 재발급 요청 버튼 (PLAN L139) */}
              <button
                onClick={handleRequestNewInvite}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white/5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
              >
                재발급 요청
              </button>
            </div>
          ) : null}

          {/* 합류 버튼 (PLAN L136-137) */}
          {!isTokenMissing ? (
            <button
              onClick={handleJoin}
              disabled={isLoading}
              className="w-full py-10 rounded-[2.5rem] bg-indigo-600 border border-indigo-400 flex flex-col items-center gap-4 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="p-4 rounded-full bg-white/20 text-white group-hover:scale-110 transition-transform duration-500">
                <LogIn size={24} />
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-widest">
                {isLoading ? '합류 중...' : '합류하기'}
              </span>
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default OperatorJoinPage;
