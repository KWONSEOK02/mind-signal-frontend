'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { SignalMeasurer, useSignal } from '@/05-features/signals';
import { QRGenerator, usePairing } from '@/05-features/sessions';
import { SignalComparisonWidget } from '@/04-widgets';
import {
  LayoutDashboard,
  Activity,
  Settings,
  PlusCircle,
  X,
} from 'lucide-react';

const emptySubscribe = () => () => {};

/**
 * [Page] 2인 대칭 모니터링 및 세션 관리가 통합된 실시간 실험실 페이지임
 */
const LabPage = () => {
  /**
   * AGENTS 6.5: 클라이언트 마운트 여부를 동기적으로 확인 수행함
   */
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [hostId] = useState<string>('session-host-001');
  const [participantId] = useState<string>('session-guest-002');
  const [isQRVisible, setIsQRVisible] = useState(false);

  /**
   * AGENTS 5.1: 페어링 비즈니스 로직 및 뇌파 지표 수집 연동함
   */
  const { pairingCode, timeLeft, startPairing } = usePairing();
  const hostSignal = useSignal(hostId);
  const guestSignal = useSignal(participantId);

  /**
   * 하이드레이션 불일치 방지를 위해 마운트 전에는 배경만 렌더링함
   */
  if (!isClient) return <div className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 pt-24 pb-12 px-6">
      <div className="max-w-[1600px] mx-auto space-y-10">
        {/* 대시보드 헤더 정의함 */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-500 mb-1">
              <LayoutDashboard size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Real-time Analysis
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic">
              DUAL <span className="text-indigo-500">SIGNAL</span> MONITOR
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              호스트와 참가자의 데이터를 실시간 대조 분석함
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* 세션 생성 토글 버튼임 */}
            <button
              onClick={() => {
                if (!isQRVisible) startPairing();
                setIsQRVisible(!isQRVisible);
              }}
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden shadow-lg shadow-indigo-500/20"
            >
              {isQRVisible ? <X size={20} /> : <PlusCircle size={20} />}
              <span>{isQRVisible ? '닫기' : '세션 생성'}</span>
            </button>
            <div className="h-10 w-[1px] bg-white/10 mx-2" />
            <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* QR 생성 섹션 - 데이터 부재 시의 예외 처리 수행함 */}
        {isQRVisible && (
          <section className="animate-in fade-in zoom-in duration-500">
            <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20 backdrop-blur-sm flex flex-col items-center gap-6">
              <QRGenerator
                value={pairingCode || 'SESSION-LOADING...'}
                timeLeft={timeLeft}
                onRefresh={startPairing}
                isDark={true}
              />
            </div>
          </section>
        )}

        {/* 2인 대칭 모니터링 섹션임 */}
        <section className="min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <SignalComparisonWidget
            hostMetrics={hostSignal.currentMetrics}
            participantMetrics={guestSignal.currentMetrics}
          />
        </section>

        {/* 제어 및 시스템 상태 패널 구성함 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
          <div className="lg:col-span-2">
            <SignalMeasurer
              sessionId={hostId}
              isMeasuring={hostSignal.isMeasuring}
              onStart={hostSignal.startMeasurement}
              onStop={hostSignal.stopMeasurement}
              lastSentTime={hostSignal.lastSentTime}
            />
          </div>

          <div className="p-8 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden group">
            <Activity
              className="absolute -right-4 -top-4 text-indigo-500/5 group-hover:scale-110 transition-transform duration-500"
              size={120}
            />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">
                  System Status
                </span>
              </div>
              <p className="text-2xl font-black text-white uppercase italic tracking-tighter">
                Dual Linked
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                현재 호스트 데이터 수신 중이며 참가자 연결을 대기하고 있음.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LabPage;
