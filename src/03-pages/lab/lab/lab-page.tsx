'use client';

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
import {
  LayoutDashboard,
  Activity,
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
  // 모드 상태 및 드롭다운 토글 상태 관리 추가함
  const [mode, setMode] = useState<'DUAL' | 'BTI'>('DUAL');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
   * 상태 기반으로 현재 실험 설정 동적 로드함
   */
  const currentConfig = EXPERIMENT_CONFIG[mode];

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
   * 실험 모드 변경 시 세션 초기화 및 UI 닫기 일괄 처리함
   */
  const handleModeChange = useCallback(
    (newMode: 'DUAL' | 'BTI') => {
      setMode(newMode);
      resetStatus();
      setIsQRVisible(false);
      setIsSettingsOpen(false);
    },
    [resetStatus]
  );

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
            {/* 설정 버튼 및 드롭다운 메뉴 컨테이너 위치함 */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <Settings size={20} />
              </button>
              {isSettingsOpen && (
                <>
                  {/* 드롭다운 외부 영역 클릭 시 메뉴를 닫기 위한 투명 백드롭 적용함 */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-48 p-2 rounded-xl bg-slate-800 border border-slate-700 shadow-xl z-50 flex flex-col gap-1">
                    <button
                      onClick={() => handleModeChange('DUAL')}
                      className={`px-4 py-3 text-sm font-bold text-left rounded-lg transition-colors ${
                        mode === 'DUAL'
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      DUAL 모드 (2인)
                    </button>
                    <button
                      onClick={() => handleModeChange('BTI')}
                      className={`px-4 py-3 text-sm font-bold text-left rounded-lg transition-colors ${
                        mode === 'BTI'
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      BTI 모드 (1인)
                    </button>
                  </div>
                </>
              )}
            </div>
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
                subjectIndex={pairedSubjects.length + 1}
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
  );
};

export default LabPage;
