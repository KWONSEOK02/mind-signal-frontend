'use client';

<<<<<<< HEAD
import React, {
  useState,
  useSyncExternalStore,
  useCallback,
  useEffect,
} from 'react';
import { useSignal } from '@/05-features/signals';
import { QRGenerator, usePairing } from '@/05-features/sessions';
import { SignalComparisonWidget } from '@/04-widgets';
import { EXPERIMENT_CONFIG } from '@/07-shared';
import MobileLabView from './ui/mobile-lab-view';

// next.config.ts의 optimizePackageImports 설정으로 인해 성능 저하 없이 편리한 임포트 사용함
=======
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// FSD 규칙 준수: Features 계층의 Public API 참조함
import { usePairing, QRGenerator } from '@/05-features/sessions';
>>>>>>> main
import {
  LayoutDashboard,
  Activity,
<<<<<<< HEAD
  Settings,
  PlusCircle,
  Play,
  X,
  CheckCircle2,
} from 'lucide-react';

const emptySubscribe = () => () => {};

/**
 * [Page] 운영자가 실험 모드에 따라 피실험자를 연결하고 모니터링하는 대시보드 정의함
 * 진입점에서 환경을 감지하여 모바일인 경우 참여 유도 인터페이스로 전환 수행함
 */
const LabPage = () => {
  // 클라이언트 사이드 마운트 여부 확인 수행함
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isMobile, setIsMobile] = useState(false);
  const [isQRVisible, setIsQRVisible] = useState(false);

  /**
   * 브라우저 환경 및 화면 너비를 감지하여 모바일 모드 여부 결정함
   * Window Resize 이벤트를 구독하여 실시간 대응함
   */
  useEffect(() => {
    if (!isClient) return;

    const checkEnvironment = () => {
      const isSmallScreen = window.innerWidth < 768;
      const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsMobile(isSmallScreen || isMobileUA);
    };

    checkEnvironment();
    window.addEventListener('resize', checkEnvironment);
    return () => window.removeEventListener('resize', checkEnvironment);
  }, [isClient]);

  /**
   * 현재 실험 설정 로드함
   */
  const currentConfig = EXPERIMENT_CONFIG.DUAL;

  /**
   * 설정된 목표 인원수를 기반으로 페어링 로직 구동함
   */
  const {
    pairingCode,
    groupId,
    timeLeft,
    pairedSubjects,
    isAllPaired,
    startPairing,
    resetStatus,
  } = usePairing(currentConfig.targetCount);

  const subject1Signal = useSignal(groupId, 1);
  const subject2Signal = useSignal(groupId, 2);

  /**
   * 모든 활성화된 피실험자의 데이터 측정 시작 수행함
   */
  const handleStartExperiment = useCallback(() => {
    subject1Signal.startMeasurement();
    if (currentConfig.targetCount > 1) {
      subject2Signal.startMeasurement();
    }
  }, [subject1Signal, subject2Signal, currentConfig.targetCount]);

  /**
   * 서버 사이드 렌더링 시 하이드레이션 오류 방지를 위해 빈 화면 반환함
   */
  if (!isClient) return <div className="min-h-screen bg-slate-950" />;

  /**
   * [진입점 검사] 모바일 환경인 경우 실험 참여 유도 뷰로 즉시 전환함
   */
  if (isMobile) {
    return <MobileLabView />;
  }

  /**
   * 상태에 따른 제어 버튼 렌더링 함수 정의함
   */
  const renderControlButton = () => {
    if (isAllPaired) {
      return (
        <button
          onClick={handleStartExperiment}
          className="group relative inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/20"
        >
          <Play size={20} fill="currentColor" />
          <span>실험 시작</span>
        </button>
      );
    }

    const nextSubjectNum = pairedSubjects.length + 1;
    const buttonText = `Subject 0${nextSubjectNum} 연결 QR 생성`;

    return (
      <button
        onClick={() => {
          if (isQRVisible) {
            // QR 닫기 시 세션 리소스를 완전히 해제하여 잔여 데이터 제거함
            resetStatus();
            setIsQRVisible(false);
          } else {
            startPairing();
            setIsQRVisible(true);
          }
        }}
        className="group relative inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/20"
      >
        {isQRVisible ? <X size={20} /> : <PlusCircle size={20} />}
        <span>{isQRVisible ? '닫기' : buttonText}</span>
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 pt-24 pb-12 px-6">
      <div className="max-w-[1600px] mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-500 mb-1">
              <LayoutDashboard size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Operator Dashboard
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic">
              {currentConfig.title.split(' ')[0]}{' '}
              <span className="text-indigo-500">
                {currentConfig.title.split(' ')[1]}
              </span>{' '}
              {currentConfig.title.split(' ')[2]}
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              {currentConfig.description}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {renderControlButton()}
            <div className="h-10 w-[1px] bg-white/10 mx-2" />
            <button
              onClick={() => {
                // 설정 버튼 클릭 시 세션 리셋과 QR 닫기를 병행하여 UI 동기화함
                resetStatus();
                setIsQRVisible(false);
              }}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {isQRVisible && !isAllPaired && (
          <section className="animate-in fade-in zoom-in duration-500">
            <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20 backdrop-blur-sm flex flex-col items-center gap-6">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                STEP {pairedSubjects.length + 1}: SUBJECT 0
                {pairedSubjects.length + 1} WAITING
              </p>
              <QRGenerator
                value={pairingCode || 'SESSION-LOADING...'}
                timeLeft={timeLeft}
                onRefresh={startPairing}
                isDark={true}
              />
            </div>
          </section>
        )}

        <section className="min-h-[400px]">
          <SignalComparisonWidget
            subject1Metrics={subject1Signal.currentMetrics}
            subject2Metrics={
              currentConfig.targetCount > 1
                ? subject2Signal.currentMetrics
                : null
            }
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
          <div className="lg:col-span-2">
            <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Connection Status
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((num) => (
                  <div
                    key={num}
                    className={`p-4 rounded-xl border flex flex-col gap-1 ${pairedSubjects.includes(num) ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/[0.03] border-white/5'} ${num > currentConfig.targetCount ? 'opacity-20' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">
                        Subject 0{num}
                      </p>
                      {pairedSubjects.includes(num) && (
                        <CheckCircle2 size={14} className="text-indigo-500" />
                      )}
                    </div>
                    <p
                      className={`text-lg font-black ${pairedSubjects.includes(num) ? 'text-white' : 'text-slate-700'}`}
                    >
                      {pairedSubjects.includes(num)
                        ? 'CONNECTED'
                        : num > currentConfig.targetCount
                          ? 'DISABLED'
                          : 'WAITING'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden group">
            <Activity
              className="absolute -right-4 -top-4 text-indigo-500/5 group-hover:scale-110 transition-transform duration-500"
              size={120}
            />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isAllPaired ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
                />
                <span className="text-xs font-bold text-white uppercase tracking-widest">
                  System Phase
                </span>
              </div>
              <p className="text-2xl font-black text-white uppercase italic tracking-tighter">
                {isAllPaired ? 'Experiment Ready' : 'Awaiting Entry'}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                운영자 채널 활성화 완료됨. {currentConfig.targetCount}명의
                피실험자가 합류해야 실험 시작 버튼이 활성화됨.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
=======
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
>>>>>>> main
  );
};

export default LabPage;
