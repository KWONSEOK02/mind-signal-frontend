'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePairing } from '@/05-features/sessions';
import QRScanner from '@/05-features/sessions/ui/qr-scanner';
import {
  Camera,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

/**
 * [Page] 모바일 사용자의 페어링 참여 및 스캔 프로세스 관리 페이지 정의함
 */
const JoinPage = () => {
  const searchParams = useSearchParams();
  const { status, requestPairing, resetStatus } = usePairing();

  const [isScanning, setIsScanning] = useState(false);
  const [mounted, setMounted] = useState(false);
  // 중복 처리를 방지하기 위한 Ref 사용함
  const lastProcessedCode = useRef<string | null>(null);

  /**
   * 하이드레이션Mismatch 방지 및 URL 기반 자동 페어링 로직 수행함
   */
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });

    const currentCode = searchParams?.get('code');

    // 코드가 존재하고 이전에 처리한 코드와 다를 경우에만 실행함
    if (currentCode && currentCode !== lastProcessedCode.current) {
      lastProcessedCode.current = currentCode;
      resetStatus(); // 이전 상태 초기화함
      requestPairing(currentCode);
    }

    return () => cancelAnimationFrame(frameId);
  }, [searchParams, requestPairing, resetStatus]);

  /**
   * 스캔 성공 시 페어링 요청 처리 수행함
   */
  const handleScanSuccess = async (code: string) => {
    setIsScanning(false);
    lastProcessedCode.current = code;
    await requestPairing(code);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center bg-slate-950">
      {/* 스캔 모드 활성화 시 전체 화면 스캐너 노출함 */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black">
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setIsScanning(false)}
          />
        </div>
      )}

      {/* 1. 페어링 성공 상태 UI 구성함 */}
      {status === 'PAIRED' ? (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/30">
            <CheckCircle2 className="text-emerald-500 w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">
              Connected
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              기기 연동이 완료됨
              <br />
              실험실 화면에서 신호를 확인함
            </p>
          </div>
        </div>
      ) : (
        /* 2. 대기 및 스캔 시작 UI 구성함 */
        !isScanning && (
          <div className="space-y-8 w-full max-w-sm animate-in fade-in duration-700">
            <div className="relative mx-auto w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center">
              <Smartphone className="text-indigo-500 w-12 h-12" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center animate-bounce">
                <Camera className="text-white w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                실험 참여하기
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                {status === 'LOADING'
                  ? '연결 정보를 확인 중임...'
                  : 'QR 코드를 스캔하여 세션에 접속함'}
              </p>
            </div>

            <button
              onClick={() => setIsScanning(true)}
              disabled={status === 'LOADING'}
              className="w-full py-4 bg-white hover:bg-slate-200 text-slate-950 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Camera size={22} />
              QR 스캔 시작함
            </button>

            {/* 에러 피드백 영역 정의함 */}
            {(status === 'ERROR' || status === 'EXPIRED') && (
              <div className="pt-4 space-y-3 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-center gap-2 text-red-500">
                  <AlertCircle size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {status === 'EXPIRED'
                      ? 'Session Expired'
                      : 'Connection Failed'}
                  </span>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 mx-auto text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                >
                  <RefreshCw size={12} />
                  다시 시도하기
                </button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default JoinPage;
