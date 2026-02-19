'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { usePairing } from '@/05-features/sessions';

/**
 * [Client] QR 스캔 후 자동으로 기기를 연결하는 페어링 착륙 페이지임
 */
const JoinPage = () => {
  const searchParams = useSearchParams();
  const { status, requestPairing } = usePairing();

  /**
   * URL 파라미터에서 코드를 읽어 자동으로 페어링 요청 수행함
   */
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && status === 'IDLE') {
      requestPairing(code);
    }
  }, [searchParams, status, requestPairing]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* 헤더 섹션 정의함 */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest">
            Device Pairing
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">
            Mind Signal <br />
            <span className="text-indigo-500">Connection</span>
          </h1>
        </div>

        {/* 상태별 UI 렌더링 영역 구성함 */}
        <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          {status === 'LOADING' || status === 'IDLE' ? (
            <>
              <Loader2
                size={48}
                className="mx-auto text-indigo-500 animate-spin"
              />
              <p className="text-slate-400 font-medium">
                기기를 연결하는 중임...
              </p>
            </>
          ) : status === 'PAIRED' ? (
            <>
              <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
              <div className="space-y-2">
                <p className="text-xl font-bold">연결 성공함</p>
                <p className="text-sm text-slate-400">
                  이제 실험실(PC) 화면에서 <br /> 실시간 데이터를 확인할 수
                  있습니다.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={48} className="mx-auto text-red-500" />
              <div className="space-y-4">
                <p className="text-xl font-bold">연결 실패함</p>
                <p className="text-sm text-slate-400">
                  코드가 만료되었거나 <br /> 잘못된 접근입니다.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-slate-800 rounded-xl text-sm font-bold"
                >
                  다시 시도합니다
                </button>
              </div>
            </>
          )}
        </div>

        {/* 하단 안내 가이드 포함함 */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium italic">
          <Smartphone size={14} />
          MOBILE CLIENT ACTIVE
        </div>
      </div>
    </div>
  );
};

export default JoinPage;
