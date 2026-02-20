'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePairing } from '@/05-features/sessions/model/use-pairing';
import QRScanner from '@/05-features/sessions/ui/qr-scanner';
import { Camera, Smartphone, CheckCircle2 } from 'lucide-react';

/**
 * [Page] 모바일 사용자의 페어링 참여 및 스캔 프로세스 관리 페이지 정의함
 */
export const JoinPage = () => {
  const searchParams = useSearchParams();
  const { status, requestPairing } = usePairing();

  const [isScanning, setIsScanning] = useState(false);
  const [mounted, setMounted] = useState(false);

  /**
   * 하이드레이션Mismatch 방지 및 자동 페어링 로직 수행함
   */
  useEffect(() => {
    // 린트 에러 해결: 지연 실행을 통해 Cascading Render 방지 수행함
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });

    // initialCode 경고 해결: URL에 코드가 있을 경우 자동 페어링 시도함
    const initialCode = searchParams?.get('code');
    if (initialCode && status === 'IDLE') {
      requestPairing(initialCode);
    }

    return () => cancelAnimationFrame(frameId);
  }, [searchParams, status, requestPairing]);

  /**
   * 스캔 성공 시 페어링 요청 처리 수행함
   */
  const handleScanSuccess = async (code: string) => {
    setIsScanning(false);
    await requestPairing(code);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      {/* 초기 대기 상태 UI 구성함 */}
      {(status === 'IDLE' || status === 'LOADING') && !isScanning && (
        <div className="space-y-8 w-full max-w-sm">
          <div className="relative mx-auto w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center">
            <Smartphone className="text-indigo-500 w-12 h-12" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center animate-bounce">
              <Camera className="text-white w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-black tracking-tight">
              실험실 기기 연결
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              PC 화면에 표시된 QR 코드를 스캔하여
              <br />
              실시간 뇌파 측정 세션에 참여하세요.
            </p>
          </div>

          <button
            onClick={() => setIsScanning(true)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <Camera size={22} />
            QR 스캔 시작
          </button>

          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">
            Authorized Connection Only
          </p>
        </div>
      )}

      {/* 스캔 모드 활성화 시 스캐너 컴포넌트 노출함 */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black">
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setIsScanning(false)}
          />
        </div>
      )}

      {/* 페어링 성공 상태 표시함 */}
      {status === 'PAIRED' && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/30">
            <CheckCircle2 className="text-emerald-500 w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">연결 성공함</h2>
            <p className="text-slate-400 text-sm">
              이제 실험실(PC) 화면에서
              <br />
              실시간 데이터를 확인할 수 있습니다.
            </p>
          </div>
          <div className="pt-4">
            <span className="px-4 py-2 bg-slate-800 rounded-full text-[10px] text-slate-400 font-bold tracking-tighter italic uppercase">
              Mobile Client Active
            </span>
          </div>
        </div>
      )}

      {/* 에러 발생 시 피드백 UI 구성함 */}
      {status === 'ERROR' && (
        <div className="space-y-4">
          <p className="text-red-500 font-bold">연결 중 오류가 발생함</p>
          <button
            onClick={() => window.location.reload()}
            className="text-indigo-400 underline text-sm"
          >
            다시 시도하기
          </button>
        </div>
      )}
    </div>
  );
};

export default JoinPage;
