'use client';

import React, {
  useState,
  useSyncExternalStore,
  useCallback,
  useEffect,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignal } from '@/05-features/signals';
import { QRGenerator, usePairing } from '@/05-features/sessions';
import { OperatorInviteQr } from '@/05-features/sessions/ui/operator-invite-qr.component';
import { useDualSession } from '@/05-features/sessions/model/use-dual-session';
import { postDualTrigger } from '@/07-shared/api/dual-trigger';
import { DualSessionBanner } from '@/04-widgets/dual-session-banner';
import { SignalComparisonWidget } from '@/04-widgets';
import { EXPERIMENT_CONFIG } from '@/07-shared';
import MobileLabView from './ui/mobile-lab-view';
import SequentialFlow from './sequential-flow';
import { useUI } from '@/app/providers/ui-context'; // 다크 라이트 모드를 위해 임포트 추가

// next.config.ts의 optimizePackageImports 설정으로 인해 성능 저하 없이 편리한 임포트 사용함
import {
  LayoutDashboard,
  Activity,
  Settings,
  PlusCircle,
  Play,
  Square,
  X,
  CheckCircle2,
  QrCode,
} from 'lucide-react';

const emptySubscribe = () => () => {};

/**
 * [Page] 운영자가 실험 모드에 따라 피실험자를 연결하고 모니터링하는 대시보드 정의함
 * 진입점에서 환경을 감지하여 모바일인 경우 참여 유도 인터페이스로 전환 수행함
 */
const LabPage = () => {
  // UI 컨텍스트에서 테마 가져오기 & isDark 변수 생성
  const ui = useUI();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDark = ui.theme === 'dark';

  // 클라이언트 사이드 마운트 여부 확인 수행함
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isMobile, setIsMobile] = useState(false);
  const [isQRVisible, setIsQRVisible] = useState(false);
  // 모드 상태 및 드롭다운 토글 상태 관리 추가함 (DUAL_2PC 추가)
  const [mode, setMode] = useState<'DUAL' | 'BTI' | 'SEQUENTIAL' | 'DUAL_2PC'>(
    'DUAL'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // DUAL_2PC 초대 QR 표시 여부 상태 정의함
  const [isDual2pcQrVisible, setIsDual2pcQrVisible] = useState(false);

  // URL query param에서 groupId 파싱 (operator-join 합류 후 리다이렉트 처리)
  const urlGroupId = searchParams?.get('groupId') ?? null;

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
   * DUAL_2PC는 DUAL과 동일한 targetCount=2 설정 재활용함
   */
  const currentConfig =
    mode === 'DUAL_2PC' ? EXPERIMENT_CONFIG['DUAL'] : EXPERIMENT_CONFIG[mode];

  /**
   * 설정된 목표 인원수를 기반으로 페어링 로직 구동함
   */
  const {
    groupId: pairingGroupId,
    pairingCode,
    timeLeft,
    pairedSubjects,
    isAllPaired,
    sessions,
    startPairing,
    resetStatus,
  } = usePairing(currentConfig.targetCount);

  // groupId: URL 파라미터 우선, 없으면 페어링에서 가져옴
  const groupId = urlGroupId ?? pairingGroupId;

  // DUAL_2PC 세션 상태 머신 훅 구독함 (Phase 16 FE-4)
  const {
    state: dualState,
    partnerConnected,
    registryStatus,
    showFallback,
    setDualSessionState,
  } = useDualSession(groupId, mode);

  // 수동 트리거 상태 정의함
  const [manualTriggerError, setManualTriggerError] = useState<string | null>(
    null
  );
  const [manualTriggerPending, setManualTriggerPending] = useState(false);

  /**
   * DE 엔진 연결 지연 시 수동 트리거 재시도 처리함
   * race 방지: ready 상태이면 즉시 반환함
   * 더블클릭 방지: pending 중이면 즉시 반환함
   */
  const handleManualTrigger = async () => {
    if (!groupId) return;
    if (registryStatus?.ready) return;
    if (manualTriggerPending) return;

    setManualTriggerPending(true);
    setManualTriggerError(null);
    try {
      await postDualTrigger(groupId);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 503) {
        setManualTriggerError(
          '두 데이터 엔진이 모두 대기 상태가 아닙니다.' +
            ' EMOTIV App과 DE 기동 상태를 확인하세요.'
        );
      } else {
        setManualTriggerError(`연결 시도 실패: ${(err as Error).message}`);
      }
    } finally {
      setManualTriggerPending(false);
    }
  };

  const subject1Signal = useSignal(sessions[0]?.id ?? null, {
    experimentMode: mode,
    groupId,
    setDualSessionState,
  });
  const subject2Signal = useSignal(sessions[1]?.id ?? null);

  /**
   * 모든 활성화된 피실험자의 데이터 측정 시작 수행함
   */
  const handleStartExperiment = useCallback(() => {
    subject1Signal.startMeasurement();
    if (currentConfig.targetCount > 1 && mode !== 'DUAL_2PC') {
      subject2Signal.startMeasurement();
    }
  }, [subject1Signal, subject2Signal, currentConfig.targetCount, mode]);

  /**
   * 두 subject 측정 완료 시 결과 페이지 이동 수행함
   */
  useEffect(() => {
    if (!groupId) return;

    if (mode === 'DUAL_2PC') {
      // DUAL_2PC: dualState 'completed' 전이 시 결과 이동함
      if (dualState === 'completed') {
        router.push(`/results?groupId=${groupId}`);
      }
      return;
    }

    const allDone =
      !subject1Signal.isMeasuring &&
      !subject2Signal.isMeasuring &&
      subject1Signal.elapsedSeconds > 0 &&
      (currentConfig.targetCount === 1 || subject2Signal.elapsedSeconds > 0);
    if (allDone) {
      router.push(`/results?groupId=${groupId}`);
    }
  }, [
    groupId,
    mode,
    dualState,
    subject1Signal.isMeasuring,
    subject2Signal.isMeasuring,
    subject1Signal.elapsedSeconds,
    subject2Signal.elapsedSeconds,
    currentConfig.targetCount,
    router,
  ]);

  /**
   * 실험 모드 변경 시 세션 초기화 및 UI 닫기 일괄 처리함
   */
  const handleModeChange = useCallback(
    (newMode: 'DUAL' | 'BTI' | 'SEQUENTIAL' | 'DUAL_2PC') => {
      setMode(newMode);
      resetStatus();
      setIsQRVisible(false);
      setIsDual2pcQrVisible(false);
      setIsSettingsOpen(false);
    },
    [resetStatus]
  );

  /**
   * 오퍼레이터가 실험 진행 중 측정 중지 요청함 — stop-all API 한 번 호출로 일괄 처리함
   */
  const handleStopExperiment = async () => {
    if (!groupId) return;
    // subject1 groupId 기준 stop-all 호출함
    await subject1Signal.stopMeasurement(groupId, 'ManualEarly');
    // subject2는 BE가 groupId로 일괄 처리하므로 소켓 정리만 수행함
    if (currentConfig.targetCount > 1) {
      void subject2Signal.stopMeasurement();
    }
  };

  // 서버 렌더링 시 하이드레이션 오류 방지 화면도 라이트/다크에 맞게 변경
  if (!isClient)
    return (
      <div
        className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
      />
    );

  /**
   * [진입점 검사] 모바일 환경인 경우 실험 참여 유도 뷰로 즉시 전환함
   */
  if (isMobile) {
    return <MobileLabView />;
  }

  /**
   * [모드 분기] SEQUENTIAL 모드인 경우 순차 측정 흐름 컴포넌트 렌더링함
   * 페어링 완료 후(isAllPaired) SEQUENTIAL 플로우로 전환함
   */
  if (mode === 'SEQUENTIAL' && isAllPaired) {
    return (
      <SequentialFlow
        sessionId1={sessions[0]?.id ?? null}
        sessionId2={sessions[1]?.id ?? null}
        groupId={groupId}
      />
    );
  }

  /**
   * 상태에 따른 제어 버튼 렌더링 함수 정의함
   */
  const renderControlButton = () => {
    // 측정 진행 중인 경우 중지 버튼 표시함
    if (subject1Signal.isMeasuring || subject2Signal.isMeasuring) {
      return (
        <button
          onClick={() => void handleStopExperiment()}
          className="group relative inline-flex items-center cursor-pointer gap-2 px-8 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-2xl font-black transition-all duration-300"
        >
          <Square size={20} fill="currentColor" />
          <span>실험 중지</span>
        </button>
      );
    }

    if (mode === 'DUAL_2PC' ? partnerConnected : isAllPaired) {
      return (
        <button
          onClick={handleStartExperiment}
          className="group relative inline-flex items-center cursor-pointer gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black transition-all duration-300 hover:scale-105 shadow-lg shadow-emerald-500/20"
        >
          <Play size={20} fill="currentColor" />
          <span>실험 시작</span>
        </button>
      );
    }

    // DUAL_2PC 모드: 폴백 노출 + 파트너 PC 초대 QR 버튼 표시함 (PLAN L175)
    if (mode === 'DUAL_2PC') {
      // showFallback=true → QR 버튼 + 수동 재연결 버튼 병렬 노출함
      if (showFallback) {
        return (
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => setIsDual2pcQrVisible((prev) => !prev)}
              className="group relative inline-flex items-center cursor-pointer gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/20"
            >
              {isDual2pcQrVisible ? <X size={20} /> : <QrCode size={20} />}
              <span>{isDual2pcQrVisible ? '닫기' : '파트너 PC 초대 QR'}</span>
            </button>
            <button
              onClick={() => void handleManualTrigger()}
              disabled={manualTriggerPending || !!registryStatus?.ready}
              className={`text-sm ${
                manualTriggerError ? 'text-rose-500' : 'text-amber-500'
              } underline disabled:opacity-50`}
            >
              {manualTriggerPending
                ? '연결 시도 중...'
                : '엔진 연결이 지연됩니다. 다시 연결 시도'}
            </button>
            {manualTriggerError ? (
              <p className="text-xs text-rose-500 max-w-md">
                {manualTriggerError}
              </p>
            ) : null}
          </div>
        );
      }

      return (
        <button
          onClick={() => setIsDual2pcQrVisible((prev) => !prev)}
          className="group relative inline-flex items-center cursor-pointer gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/20"
        >
          {isDual2pcQrVisible ? <X size={20} /> : <QrCode size={20} />}
          <span>{isDual2pcQrVisible ? '닫기' : '파트너 PC 초대 QR'}</span>
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
        className="group relative inline-flex items-center cursor-pointer gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-lg shadow-indigo-500/20"
      >
        {isQRVisible ? <X size={20} /> : <PlusCircle size={20} />}
        <span>{isQRVisible ? '닫기' : buttonText}</span>
      </button>
    );
  };

  return (
    //  1. 최상단 main 배경색을 투명하게(transparent) 하거나 테마에 맞게 변경
    <main
      className={`min-h-screen pt-24 pb-12 px-6 transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-transparent'}`}
    >
      {/* DUAL_2PC 측정 중 상단 배너 (FE-4) — PLAN L142-145 */}
      <DualSessionBanner
        experimentMode={mode}
        state={dualState}
        partnerConnected={partnerConnected}
      />

      <div className="max-w-[1600px] mx-auto space-y-10">
        {/*  2. 헤더 밑줄 색상 변경*/}
        <header
          className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10 ${isDark ? 'border-white/5' : 'border-slate-200'}`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-500 mb-1">
              <LayoutDashboard size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Operator Dashboard
              </span>
            </div>

            {/*  3. 메인 타이틀 글자색 변경*/}
            <h1
              className={`text-4xl md:text-5xl font-black tracking-tighter italic ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              {currentConfig.title.split(' ')[0]}{' '}
              <span className="text-indigo-500">
                {currentConfig.title.split(' ')[1]}
              </span>{' '}
              {currentConfig.title.split(' ')[2]}
            </h1>

            {/*}  4. 설명글 글자색 변경*/}
            <p
              className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              {mode === 'DUAL_2PC'
                ? '두 PC에서 동기화된 2PC 뇌파 측정 수행함 (Phase 16)'
                : currentConfig.description}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {renderControlButton()}
            <div
              className={`h-10 w-[1px] mx-2 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}
            />

            {/* 설정 버튼 및 드롭다운 메뉴 컨테이너 — isDark 테마 대응 */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600 shadow-sm'
                }`}
              >
                <Settings size={20} />
              </button>
              {isSettingsOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-56 p-2 rounded-xl bg-slate-800 border border-slate-700 shadow-xl z-50 flex flex-col gap-1">
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
                    <button
                      onClick={() => handleModeChange('SEQUENTIAL')}
                      className={`px-4 py-3 text-sm font-bold text-left rounded-lg transition-colors ${
                        mode === 'SEQUENTIAL'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      SEQUENTIAL 모드 (순차)
                    </button>
                    {/* DUAL_2PC 모드 선택 버튼 (PLAN L174) */}
                    <button
                      onClick={() => handleModeChange('DUAL_2PC')}
                      className={`px-4 py-3 text-sm font-bold text-left rounded-lg transition-colors ${
                        mode === 'DUAL_2PC'
                          ? 'bg-violet-500/20 text-violet-400'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      DUAL 2PC 모드 (2PC)
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {/* DUAL_2PC 파트너 PC 초대 QR 표시 (PLAN L175-180) */}
        {mode === 'DUAL_2PC' && isDual2pcQrVisible && groupId ? (
          <section className="animate-in fade-in zoom-in duration-500">
            <div
              className={`p-8 rounded-[2.5rem] border backdrop-blur-sm flex flex-col items-center gap-6 ${
                isDark
                  ? 'bg-violet-500/5 border-violet-500/20'
                  : 'bg-white/80 border-violet-100 shadow-sm'
              }`}
            >
              <p
                className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-violet-400' : 'text-violet-600'}`}
              >
                DUAL 2PC · 파트너 PC 초대
              </p>
              <OperatorInviteQr
                groupId={groupId}
                isDark={isDark}
                onClose={() => setIsDual2pcQrVisible(false)}
              />
            </div>
          </section>
        ) : null}

        {/* DUAL_2PC groupId 없을 때 안내 메시지 */}
        {mode === 'DUAL_2PC' && isDual2pcQrVisible && !groupId ? (
          <section className="animate-in fade-in zoom-in duration-500">
            <div
              className={`p-8 rounded-[2.5rem] border text-center ${
                isDark
                  ? 'bg-white/[0.02] border-white/5 text-slate-400'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <p className="text-sm font-bold">
                먼저 Subject를 페어링하여 groupId를 생성해야 함
              </p>
            </div>
          </section>
        ) : null}

        {/* 기존 페어링 QR — DUAL_2PC 이외 모드에서만 표시함 */}
        {isQRVisible && !isAllPaired && mode !== 'DUAL_2PC' ? (
          <section className="animate-in fade-in zoom-in duration-500">
            {/*}  6. QR코드 박스 배경/테두리 변경*/}
            <div
              className={`p-8 rounded-[2.5rem] border backdrop-blur-sm flex flex-col items-center gap-6 ${
                isDark
                  ? 'bg-indigo-500/5 border-indigo-500/20'
                  : 'bg-white/80 border-indigo-100 shadow-sm'
              }`}
            >
              <p
                className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
              >
                STEP {pairedSubjects.length + 1}: SUBJECT 0
                {pairedSubjects.length + 1} WAITING
              </p>
              <QRGenerator
                value={pairingCode || 'SESSION-LOADING...'}
                timeLeft={timeLeft}
                onRefresh={startPairing}
                isDark={isDark}
                subjectIndex={pairedSubjects.length + 1}
              />
            </div>
          </section>
        ) : null}

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
            {/* 7. Live Connection Status 박스 배경/테두리 변경*/}
            <div
              className={`p-8 rounded-[2rem] border space-y-4 ${
                isDark
                  ? 'bg-white/[0.02] border-white/5'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                <h3
                  className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  Live Connection Status
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((num) => (
                  <div
                    key={num}
                    className={`p-4 rounded-xl border flex flex-col gap-1 ${
                      pairedSubjects.includes(num)
                        ? isDark
                          ? 'bg-indigo-500/10 border-indigo-500/30'
                          : 'bg-indigo-50 border-indigo-200'
                        : isDark
                          ? 'bg-white/[0.03] border-white/5'
                          : 'bg-slate-50 border-slate-200'
                    } ${num > currentConfig.targetCount ? 'opacity-20' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">
                        Subject 0{num}
                      </p>
                      {pairedSubjects.includes(num) ? (
                        <CheckCircle2 size={14} className="text-indigo-500" />
                      ) : null}
                    </div>
                    {/* 9. 연결 상태 텍스트 색상 변경*/}
                    <p
                      className={`text-lg font-black ${
                        pairedSubjects.includes(num)
                          ? isDark
                            ? 'text-white'
                            : 'text-indigo-600'
                          : isDark
                            ? 'text-slate-700'
                            : 'text-slate-400'
                      }`}
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

          {/*  10. System Phase(우측 하단) 박스 배경/테두리 변경*/}
          <div
            className={`p-8 rounded-[2rem] border relative overflow-hidden group ${
              isDark
                ? 'bg-indigo-500/10 border-indigo-500/20'
                : 'bg-indigo-50 border-indigo-100'
            }`}
          >
            <Activity
              className={`absolute -right-4 -top-4 group-hover:scale-110 transition-transform duration-500 ${isDark ? 'text-indigo-500/5' : 'text-indigo-500/10'}`}
              size={120}
            />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isAllPaired || (mode === 'DUAL_2PC' && partnerConnected) ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
                />
                {/* 11. System Phase 텍스트 변경*/}
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  System Phase
                </span>
              </div>
              <p
                className={`text-2xl font-black uppercase italic tracking-tighter ${isDark ? 'text-white' : 'text-indigo-900'}`}
              >
                {mode === 'DUAL_2PC'
                  ? partnerConnected
                    ? 'Partner Ready'
                    : dualState === 'measuring'
                      ? 'Measuring'
                      : 'Awaiting Partner'
                  : isAllPaired
                    ? 'Experiment Ready'
                    : 'Awaiting Entry'}
              </p>
              <p
                className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              >
                {mode === 'DUAL_2PC'
                  ? '2PC 동기화 측정 모드. 파트너 PC가 합류해야 실험 시작 가능함.'
                  : `운영자 채널 활성화 완료됨. ${currentConfig.targetCount}명의 피실험자가 합류해야 실험 시작 버튼이 활성화됨.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LabPage;
