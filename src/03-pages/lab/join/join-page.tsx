'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePairing, QRScanner } from '@/05-features/sessions';
// 미사용된 Camera 아이콘 제거하여 린트 경고 해결함
import { CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';

/**
 * [Page] 모바일 사용자 전용 페어링 참여 및 스캔 페이지 정의함
 */
const JoinPage = () => {
  const searchParams = useSearchParams();
  const { status, requestPairing, resetStatus } = usePairing();
  const [isScanning, setIsScanning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastProcessedCode = useRef<string | null>(null);

  /**
   * 하이드레이션Mismatch 방지 및 URL 기반 자동 페어링 로직 수행함
   */
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });

    const currentCode = searchParams?.get('code');
    if (currentCode && currentCode !== lastProcessedCode.current) {
      lastProcessedCode.current = currentCode;
      resetStatus();
      requestPairing(currentCode);
    }

    return () => cancelAnimationFrame(frameId);
  }, [searchParams, requestPairing, resetStatus]);

  if (!mounted) return null;

  const handleScanSuccess = async (code: string) => {
    setIsScanning(false);
    lastProcessedCode.current = code;
    await requestPairing(code);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black">
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setIsScanning(false)}
          />
        </div>
      )}

      {status === 'PAIRED' ? (
        <div className="space-y-6 animate-in fade-in zoom-in">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/30">
            <CheckCircle2 className="text-emerald-500 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">
            Connected
          </h2>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in">
          <Smartphone className="mx-auto text-indigo-500 w-24 h-24" />
          <button
            onClick={() => setIsScanning(true)}
            className="px-8 py-4 bg-white rounded-2xl font-black text-slate-950"
          >
            QR 스캔 시작함
          </button>
        </div>
      )}

      {(status === 'ERROR' || status === 'EXPIRED') && (
        <div className="mt-8 text-red-500">
          <AlertCircle className="mx-auto mb-2" />
          <p className="text-xs font-bold uppercase tracking-widest">
            Connection Failed
          </p>
        </div>
      )}
    </div>
  );
};

export default JoinPage;
