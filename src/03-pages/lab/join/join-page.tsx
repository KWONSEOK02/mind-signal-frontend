'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import usePairing from '@/05-features/sessions/model/use-pairing';
import QRScanner from '@/05-features/sessions/ui/qr-scanner';
import {
  Camera,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

/**
 * 하이드레이션 상태 동기화를 위한 빈 구독 함수임
 */
const emptySubscribe = () => () => {};

/**
 * [Page] 실험 참가자 조인 페이지이며 모든 린트 경고가 해결된 버전임
 */
const JoinPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * AGENTS 6.5: 서버와 클라이언트의 마운트 상태를 안전하게 동기화함
   */
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { status, requestPairing, resetStatus } = usePairing();

  /**
   * 클라이언트 마운트 후 URL 파라미터(code) 감지 시 자동 페어링 수행함
   */
  useEffect(() => {
    if (!isClient) return;

    const code = searchParams.get('code');
    if (code && status === 'IDLE') {
      requestPairing(code).then((result) => {
        if (result.success) router.push('/lab');
      });
    }
  }, [isClient, searchParams, status, requestPairing, router]);

  /**
   * QR 스캔 성공 시의 페어링 요청 처리 로직임
   */
  const handleScanSuccess = async (scannedData: string) => {
    if (status === 'LOADING' || status === 'PAIRED') return;

    const result = await requestPairing(scannedData);
    if (result.success) {
      router.push('/lab');
    }
  };

  /**
   * 하이드레이션 완료 전에는 배경 레이아웃만 노출하여 시각적 불일치 방지함
   */
  if (!isClient) return <div className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* 상단 헤더 섹션 정의함 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            Participant Mode
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            실험 참가자 모드
          </h1>
          <p className="text-slate-400 text-sm">
            관리자의 화면에 표시된 QR 코드를 스캔하여 접속함
          </p>
        </div>

        {/* 인터랙션 카드 구성함 */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

          <div className="relative bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {status === 'IDLE' ||
            status === 'LOADING' ||
            status === 'PENDING' ? (
              <div className="p-8 space-y-6">
                <div className="aspect-square bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center relative overflow-hidden">
                  <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => router.back()}
                    isDark={true}
                  />
                  <div className="absolute inset-0 pointer-events-none border-[40px] border-slate-900/40"></div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                  <Camera className="text-indigo-400 shrink-0" size={20} />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    카메라를 QR 코드에 맞춰주면 자동으로 인식하여 실험 세션에
                    연결됨
                  </p>
                </div>
              </div>
            ) : status === 'PAIRED' ? (
              <div className="p-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="text-green-500" size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">연결 성공</h2>
                  <p className="text-sm text-slate-400">
                    실험 세션에 성공적으로 참여함. 잠시 후 대시보드로 이동함.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="text-red-500" size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">연결 실패</h2>
                  <p className="text-sm text-slate-400">
                    유효하지 않거나 만료된 세션임. 다시 시도 바람.
                  </p>
                </div>
                <button
                  onClick={resetStatus}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all"
                >
                  <RefreshCw size={16} /> 다시 스캔하기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 하단 정보 섹션 정의 및 Smartphone 아이콘 사용함 */}
        <div className="flex items-center justify-center gap-8 py-4 opacity-40">
          <div className="flex items-center gap-2">
            {/* 린트 경고 해결을 위해 Smartphone 컴포넌트 실제 사용함 */}
            <Smartphone size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Mobile App
            </span>
          </div>
          <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Secure Pairing
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default JoinPage;
