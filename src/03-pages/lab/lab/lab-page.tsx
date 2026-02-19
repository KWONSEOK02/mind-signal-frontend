'use client';

import React, { useState, useEffect } from 'react';
import { usePairing, QRGenerator, QRScanner } from '@/05-features/sessions';
import {
  Activity,
  Smartphone,
  Zap,
  ShieldCheck,
  Settings,
  Info,
  AlertCircle,
  Camera,
} from 'lucide-react';

/**
 * [Page] PC/모바일 환경을 자동 감지하여 최적화된 페어링 UI를 제공하는 실험실 페이지 정의함
 */
const LabPage: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { status, pairingCode, timeLeft, startPairing, requestPairing } =
    usePairing();

  /**
   * 하이드레이션Mismatch 방지 및 접속 기기 환경 판별 수행함
   */
  useEffect(() => {
    // 린트 에러 해결을 위해 requestAnimationFrame 내에서 상태 업데이트 수행함
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
      const ua = navigator.userAgent;
      const isMobileUA = /Android|iPhone|iPad|iPod/i.test(ua);
      const isSmallScreen = window.innerWidth < 768;
      // Vercel 프리뷰에서도 정확한 감지를 위해 UA와 화면 너비 동시 검사 수행함
      setIsMobile(isMobileUA || isSmallScreen);
    });

    document.documentElement.classList.toggle('dark', isDark);
    return () => cancelAnimationFrame(frameId);
  }, [isDark]);

  /**
   * 스캔 성공 시 페어링 승인 요청 처리 수행함
   */
  const handleScanSuccess = async (code: string) => {
    setIsScanning(false);
    await requestPairing(code);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        {/* 상단 헤더 섹션 구성함 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold uppercase tracking-widest">
              Experimental Lab
            </div>
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
              Mind Signal <br />
              <span className="text-indigo-500">Real-time Dashboard</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? (
                <Zap size={20} className="text-yellow-400" />
              ) : (
                <Zap size={20} className="text-slate-400" />
              )}
            </button>
            <button className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Settings size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 기기 페어링 카드 영역 정의함 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Device Connection</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                        {isMobile ? 'Mobile Client' : 'Host Dashboard'}
                      </p>
                    </div>
                  </div>
                  {status === 'PAIRED' && (
                    <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black italic">
                      <ShieldCheck size={14} /> ACTIVE
                    </div>
                  )}
                </div>

                {/* 중앙 액션 뷰포트 영역 구성함 */}
                <div className="aspect-square bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                  {/* 상태 에러 해결: CREATED 상태 포함하여 분기 처리함 */}
                  {status === 'IDLE' && !isScanning ? (
                    <div className="space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-400">
                        {isMobile ? (
                          <Camera
                            size={32}
                            className="animate-pulse text-indigo-500"
                          />
                        ) : (
                          <Smartphone size={32} />
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                          {isMobile ? 'Ready to Pair' : 'No Device Linked'}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {isMobile
                            ? 'PC 화면의 QR 코드를 스캔하여\n실시간 측정 세션에 참여하십시오.'
                            : '실시간 데이터 수집을 위해\n기기를 연결해 주십시오.'}
                        </p>
                      </div>

                      {/* 기기 환경에 따른 버튼 최적화 수행함 */}
                      {isMobile ? (
                        <button
                          onClick={() => setIsScanning(true)}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 uppercase tracking-tighter"
                        >
                          QR 스캔 시작
                        </button>
                      ) : (
                        <button
                          onClick={startPairing}
                          className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 uppercase tracking-tighter"
                        >
                          Generate QR Code
                        </button>
                      )}
                    </div>
                  ) : status === 'CREATED' && pairingCode && !isMobile ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <QRGenerator
                        value={pairingCode}
                        timeLeft={timeLeft}
                        onRefresh={startPairing}
                        isDark={isDark}
                      />
                    </div>
                  ) : status === 'PAIRED' ? (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20">
                        <ShieldCheck size={40} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-black text-emerald-500 uppercase italic">
                          Linked
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          Streaming Active
                        </p>
                      </div>
                    </div>
                  ) : (
                    (status === 'ERROR' || status === 'EXPIRED') && (
                      <div className="space-y-4">
                        <AlertCircle
                          size={32}
                          className="text-red-500 mx-auto"
                        />
                        <p className="text-xs font-bold text-red-500 uppercase">
                          {status === 'EXPIRED' ? 'Code Expired' : 'Error'}
                        </p>
                        <button
                          onClick={startPairing}
                          className="px-6 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase"
                        >
                          Retry
                        </button>
                      </div>
                    )
                  )}

                  {/* 인앱 스캐너: 모바일 스캔 모드 활성화 시 표시함 */}
                  {isScanning && (
                    <div className="absolute inset-0 z-50 bg-black">
                      <QRScanner
                        onScanSuccess={handleScanSuccess}
                        onClose={() => setIsScanning(false)}
                        isDark={isDark}
                      />
                    </div>
                  )}
                </div>

                {/* 하단 안내 섹션 및 모바일 전용 퀵 버튼 구성함 */}
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex gap-3">
                    <Info
                      size={16}
                      className="text-indigo-500 shrink-0 mt-0.5"
                    />
                    <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium italic">
                      QR 코드를 모바일 기기로 스캔하면 <br /> 즉시 실험실
                      대시보드와 연동 수행함.
                    </p>
                  </div>

                  {/* 사용자 요청 반영: 모바일 접속 시 안내 문구 하단에 스캔 버튼 배치함 */}
                  {isMobile && status === 'IDLE' && !isScanning && (
                    <button
                      onClick={() => setIsScanning(true)}
                      className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-indigo-500/20"
                    >
                      지금 바로 스캔하기
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 시그널 지표 카드 구성함 */}
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Activity size={18} className="text-indigo-400" />
                <h3 className="font-bold text-xs uppercase tracking-widest">
                  Signal Metrics
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-500 uppercase font-black">
                    Quality
                  </p>
                  <p className="text-3xl font-black italic tracking-tighter">
                    98<span className="text-sm text-indigo-500">%</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-500 uppercase font-black">
                    Latency
                  </p>
                  <p className="text-3xl font-black italic tracking-tighter">
                    12<span className="text-sm text-indigo-500">ms</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 실시간 뇌파 스트림 차트 영역 구성함 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 border border-slate-200 dark:border-slate-800 shadow-xl h-full min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                    <Activity size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-sm">
                      Brainwave Stream
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Real-time Data Analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">
                    Live
                  </span>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-all">
                <p className="text-xs font-black text-slate-300 dark:text-slate-700 italic uppercase tracking-[0.2em] animate-pulse text-center">
                  {status === 'PAIRED'
                    ? 'Receiving Brainwave Data...'
                    : 'Waiting for brainwave signal...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LabPage;
