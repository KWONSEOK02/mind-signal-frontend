'use client';

import React, { useState, useEffect } from 'react';
import { usePairing } from '@/05-features/sessions';
import { QRGenerator } from '@/05-features/sessions';
import {
  Activity,
  Smartphone,
  Zap,
  ShieldCheck,
  Settings,
  Info,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

/**
 * [Page] 실험실 메인 페이지 컴포넌트 정의함
 */
const LabPage: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const { status, pairingCode, timeLeft, startPairing } = usePairing();

  /**
   * 컴포넌트 마운트 시 초기 테마 설정 수행함
   */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 상단 헤더 섹션 구성함 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold uppercase tracking-widest">
              Experimental Lab
            </div>
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase">
              Mind Signal <br />
              <span className="text-indigo-500">Real-time Dashboard</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
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
          {/* 기기 페어링 카드 구성함 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Smartphone size={120} />
              </div>

              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Device Connection</h3>
                      <p className="text-xs text-slate-500 uppercase font-medium">
                        Mobile Pairing
                      </p>
                    </div>
                  </div>
                  {/* 상태 비교 에러 해결함: PairingUIStatus 타입 활용함 */}
                  {status === 'PAIRED' && (
                    <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                      <ShieldCheck size={14} /> ACTIVE
                    </div>
                  )}
                </div>

                <div className="aspect-square bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center">
                  {/* 상태별 UI 분기 처리 수행함 */}
                  {status === 'IDLE' ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-400">
                        <Smartphone size={32} />
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold">No Device Linked</p>
                        <p className="text-xs text-slate-500">
                          실시간 데이터 수집을 위해 <br /> 기기를 연결해
                          주십시오.
                        </p>
                      </div>
                      <button
                        onClick={startPairing}
                        className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-indigo-500/25"
                      >
                        GENERATE QR CODE
                      </button>
                    </div>
                  ) : status === 'LOADING' ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-indigo-500">
                          <RefreshCw size={24} />
                        </div>
                      </div>
                      <p className="text-sm font-bold animate-pulse text-indigo-500">
                        CONNECTING...
                      </p>
                    </div>
                  ) : status === 'PAIRED' ? (
                    <div className="space-y-4">
                      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                        <ShieldCheck size={40} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-bold">연결 완료됨</p>
                        <p className="text-xs text-slate-500">
                          기기로부터 데이터를 <br /> 수신하는 중임
                        </p>
                      </div>
                    </div>
                  ) : status === 'ERROR' || status === 'EXPIRED' ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                        <AlertCircle size={32} />
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-red-500">
                          {status === 'EXPIRED'
                            ? 'Code Expired'
                            : 'Connection Error'}
                        </p>
                        <button
                          onClick={startPairing}
                          className="px-6 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
                        >
                          RETRY
                        </button>
                      </div>
                    </div>
                  ) : status === 'CREATED' && pairingCode ? (
                    /* 2367 에러 해결: CREATED 상태 비교 정상화함 */
                    <div className="w-full h-full flex items-center justify-center">
                      <QRGenerator
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?page=join&code=${pairingCode}`}
                        timeLeft={timeLeft}
                        onRefresh={startPairing}
                        isDark={isDark}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3">
                  <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium italic">
                    QR 코드를 모바일 기기로 스캔하면 <br /> 즉시 실험실
                    대시보드와 연동 수행함.
                  </p>
                </div>
              </div>
            </div>

            {/* 데이터 통계 카드 포함함 */}
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Activity size={20} className="text-indigo-400" />
                <h3 className="font-bold">Signal Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Quality
                  </p>
                  <p className="text-2xl font-black italic">
                    98<span className="text-sm text-indigo-500">%</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Latency
                  </p>
                  <p className="text-2xl font-black italic">
                    12<span className="text-sm text-indigo-500">ms</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 실시간 그래프 영역 구성함 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl h-full min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Activity size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold uppercase tracking-tight">
                      Brainwave Stream
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Real-time EEG Data Analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">
                    Live Stream
                  </span>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <p className="text-sm font-bold text-slate-400 italic uppercase tracking-widest">
                  Waiting for brainwave signal...
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
