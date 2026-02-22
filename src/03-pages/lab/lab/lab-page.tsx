'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// FSD 규칙 준수: Features 계층의 Public API 참조함
import { usePairing, QRGenerator } from '@/05-features/sessions';
import {
  Activity,
  FlaskConical,
  BrainCircuit,
  Zap,
  Smartphone,
  Camera,
} from 'lucide-react';

/**
 * [Page] 기종이 아닌 '환경(사이즈/OS)'을 감지하여 최적화된 인터페이스를 제공하는 실험실 페이지 정의함
 */
const LabPage: React.FC = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // PC 관제 화면을 위한 두 명의 유저 상태 인스턴스 생성함
  const userA = usePairing();
  const userB = usePairing();

  /**
   * 하이드레이션Mismatch 방지 및 환경 감지 로직 수행함
   */
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);

      // 1. 운영체제 확인 (User-Agent 방식) 사용함
      const ua = navigator.userAgent;
      const isMobileUA = /Android|iPhone|iPad|iPod/i.test(ua);

      // 2. 화면 너비 확인 (Breakpoint 방식) 사용함
      const isSmallScreen = window.innerWidth < 768;

      // 두 조건 중 하나라도 만족하면 모바일 전용 UI 노출함
      setIsMobile(isMobileUA || isSmallScreen);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  if (!mounted) return null;

  /**
   * [PC 전용] 실험 대상자별 데이터 패널 UI 렌더링 함수 정의함
   */
  const renderSubjectPanel = (
    user: ReturnType<typeof usePairing>,
    label: string,
    color: string
  ) => (
    <div
      className={`p-8 rounded-[2rem] border-2 bg-slate-900/20 border-slate-800 flex-1 flex flex-col gap-6 transition-all duration-500`}
    >
      <div className="flex justify-between items-center">
        <h3
          className={`text-xs font-black uppercase tracking-widest text-${color}-500`}
        >
          {label}
        </h3>
        {user.status === 'PAIRED' && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase font-mono tracking-tighter">
              Streaming
            </span>
            <span
              className={`flex h-2.5 w-2.5 rounded-full bg-${color}-500 animate-pulse`}
            />
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center border border-slate-800/50 rounded-2xl bg-slate-950/50 min-h-[350px] relative overflow-hidden">
        {user.status === 'PAIRED' ? (
          <div className="text-center animate-in zoom-in duration-700">
            <BrainCircuit
              size={64}
              className={`text-${color}-500 mb-4 animate-pulse`}
            />
            <p className="text-sm font-black text-white uppercase tracking-tighter">
              Neural Signal Active
            </p>
          </div>
        ) : (
          <div className="scale-95 flex flex-col items-center gap-6">
            {!user.pairingCode ? (
              <button
                onClick={user.startPairing}
                className="group flex flex-col items-center gap-4 transition-all"
              >
                <div className="p-5 rounded-full border-2 border-dashed border-slate-700 group-hover:border-slate-400 group-hover:bg-slate-800 transition-all">
                  <Zap className="text-slate-600 group-hover:text-white" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Generate Access QR
                </span>
              </button>
            ) : (
              <QRGenerator
                value={`${window.location.origin}/join?code=${user.pairingCode}`}
                timeLeft={user.timeLeft}
                onRefresh={user.startPairing}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * [모바일 전용] 실험 참여를 유도하는 전용 UI 렌더링 수행함
   */
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="space-y-10 w-full max-w-sm animate-in fade-in duration-700">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full animate-pulse" />
            <div className="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl">
              <Smartphone className="w-full h-full text-indigo-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              Participant Mode
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              모바일 기기를 연동하여
              <br />
              실험 데이터를 전송함
            </p>
          </div>

          <button
            onClick={() => router.push('/join')}
            className="w-full group relative px-8 py-5 bg-white rounded-2xl font-black text-slate-950 flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95"
          >
            <Camera size={22} />
            <span>실험 참여하기 (QR 스캔)</span>
          </button>

          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] pt-4">
            Mind Signal Neural Interface
          </p>
        </div>
      </div>
    );
  }

  /**
   * [PC 전용] 듀얼 슬롯 관제 레이아웃 렌더링 수행함
   */
  return (
    <div className="min-h-screen bg-slate-950 p-8 flex flex-col gap-8">
      <header className="flex justify-between items-center px-4">
        <div className="flex items-center gap-3">
          <FlaskConical className="text-indigo-500" size={28} />
          <div>
            <h1 className="text-xl font-black uppercase text-white tracking-tighter leading-none">
              Mind Signal Lab
            </h1>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.4em] mt-1">
              Dual Monitoring Hub
            </p>
          </div>
        </div>
        <div className="px-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-full">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
            System Online
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-8 max-w-[1600px] mx-auto w-full">
        {renderSubjectPanel(userA, 'Subject Alpha', 'indigo')}

        <section className="w-full lg:w-1/3 bg-slate-900/40 border border-slate-800 rounded-[3rem] flex flex-col items-center justify-center p-12 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          <Activity size={48} className="text-slate-800 mb-8" />
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
              Synchrony
            </h2>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
              Correlation Score
            </p>
          </div>
          <div className="mt-10 text-[6rem] font-black text-slate-900 tracking-tighter leading-none select-none font-mono">
            {userA.status === 'PAIRED' && userB.status === 'PAIRED'
              ? '96%'
              : '00%'}
          </div>
        </section>

        {renderSubjectPanel(userB, 'Subject Beta', 'emerald')}
      </main>
    </div>
  );
};

export default LabPage;
