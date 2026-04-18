'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Square,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useSequentialMeasurement } from '@/05-features/signals/model/use-sequential-measurement';
import type { SequentialMeasurementState } from '@/05-features/signals/model/use-sequential-measurement';
import SignalRealtimeChart from '@/04-widgets/signal-chart/ui/signal-realtime-chart';
import { useUI } from '@/app/providers/ui-context';

interface SequentialFlowProps {
  sessionId1: string | null;
  sessionId2: string | null;
  groupId: string | null;
}

/**
 * 시각적 진행 단계 인덱스 계산함 (0=Subject1, 1=Subject2, 2=Analyzing)
 */
function getActiveStep(state: SequentialMeasurementState): number {
  switch (state) {
    case 'READY':
    case 'SUBJECT_1_MEASURING':
    case 'SUBJECT_1_DONE':
      return 0;
    case 'SUBJECT_2_READY':
    case 'SUBJECT_2_MEASURING':
    case 'SUBJECT_2_DONE':
      return 1;
    case 'ANALYZING':
    case 'COMPLETED':
      return 2;
    default:
      return 0;
  }
}

/**
 * SEQUENTIAL 모드에서 어느 피실험자가 현재 활성 측정 중인지 반환함
 */
function getActiveSubjectIndex(
  state: SequentialMeasurementState
): 1 | 2 | undefined {
  if (state === 'SUBJECT_1_MEASURING') return 1;
  if (state === 'SUBJECT_2_MEASURING') return 2;
  return undefined;
}

/**
 * [Page] SEQUENTIAL 실험 모드의 순차 측정 흐름 컴포넌트 정의함
 * Subject 1 → Subject 2 → 분석 3단계 진행 바 표시함
 */
const SequentialFlow: React.FC<SequentialFlowProps> = ({
  sessionId1,
  sessionId2,
  groupId,
}) => {
  const { theme } = useUI();
  const isDark = theme === 'dark';
  const router = useRouter();

  const {
    state,
    startSubject,
    stopCurrentSubject,
    triggerAnalysis,
    abort,
    subject1Metrics,
    subject2Metrics,
  } = useSequentialMeasurement(sessionId1, sessionId2, groupId);

  const activeStep = getActiveStep(state);
  const activeSubjectIndex = getActiveSubjectIndex(state);

  // COMPLETED 상태이면 결과 페이지로 이동함
  React.useEffect(() => {
    if (state === 'COMPLETED' && groupId) {
      router.push(`/results?groupId=${groupId}`);
    }
  }, [state, groupId, router]);

  const steps = ['Subject 1', 'Subject 2', 'Analyzing'];

  /**
   * 현재 상태에 따른 주 액션 버튼 렌더링 함수 정의함
   */
  const renderControlButtons = () => {
    const isMeasuring =
      state === 'SUBJECT_1_MEASURING' || state === 'SUBJECT_2_MEASURING';

    return (
      <div className="flex items-center gap-3 flex-wrap">
        {/* Start Subject 1 버튼 */}
        <button
          onClick={() => startSubject(1)}
          disabled={state !== 'READY'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all duration-300 cursor-pointer"
        >
          <Play size={16} fill="currentColor" />
          Start Subject 1
        </button>

        {/* Start Subject 2 버튼 */}
        <button
          onClick={() => startSubject(2)}
          disabled={state !== 'SUBJECT_1_DONE'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all duration-300 cursor-pointer"
        >
          <Play size={16} fill="currentColor" />
          Start Subject 2
        </button>

        {/* Stop 버튼 — 측정 중인 경우만 표시함 */}
        {isMeasuring ? (
          <button
            onClick={stopCurrentSubject}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold transition-all duration-300 cursor-pointer"
          >
            <Square size={16} fill="currentColor" />
            Stop
          </button>
        ) : null}

        {/* Analyze 버튼 — SUBJECT_2_DONE 이후에만 활성화함 */}
        <button
          onClick={() => void triggerAnalysis()}
          disabled={state !== 'SUBJECT_2_DONE'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-white/5 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all duration-300 cursor-pointer"
        >
          {state === 'ANALYZING' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <BarChart2 size={16} />
          )}
          Analyze
        </button>

        {/* Abort 버튼 — SESSION_ABORTED 이전 상태에서만 표시함 */}
        {state !== 'SESSION_ABORTED' && state !== 'COMPLETED' ? (
          <button
            onClick={abort}
            className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-2xl font-bold transition-all duration-300 cursor-pointer"
          >
            <AlertTriangle size={16} />
            Abort
          </button>
        ) : null}
      </div>
    );
  };

  if (state === 'SESSION_ABORTED') {
    return (
      <div
        className={`min-h-screen pt-24 pb-12 px-6 ${isDark ? 'bg-slate-950' : 'bg-transparent'}`}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center space-y-6 py-24 text-center">
          <div className="w-20 h-20 bg-rose-500/10 border-2 border-rose-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle size={40} className="text-rose-400" />
          </div>
          <h2
            className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            실험 중단됨
          </h2>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            세션이 중단되었습니다. 재실험이 필요합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main
      className={`min-h-screen pt-24 pb-12 px-6 transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-transparent'}`}
    >
      <div className="max-w-[1600px] mx-auto space-y-10">
        {/* 헤더 */}
        <header
          className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10 ${isDark ? 'border-white/5' : 'border-slate-200'}`}
        >
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
              Sequential Experiment
            </div>
            <h1
              className={`text-4xl md:text-5xl font-black tracking-tighter italic ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              Sequential <span className="text-emerald-500">Measurement</span>
            </h1>
            <p
              className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              시분할 순차 측정 모드 — Subject 1 완료 후 Subject 2 측정 진행함
            </p>
          </div>

          {renderControlButtons()}
        </header>

        {/* 3단계 진행 바 */}
        <section>
          <div className="flex items-center gap-0">
            {steps.map((step, idx) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all duration-500 ${
                      idx < activeStep
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : idx === activeStep
                          ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse'
                          : isDark
                            ? 'bg-white/5 border-white/10 text-slate-600'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}
                  >
                    {idx < activeStep ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-bold whitespace-nowrap ${
                      idx === activeStep
                        ? isDark
                          ? 'text-white'
                          : 'text-slate-900'
                        : isDark
                          ? 'text-slate-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {idx < steps.length - 1 ? (
                  <div
                    className={`flex-1 h-1 mx-3 rounded-full transition-all duration-500 ${
                      idx < activeStep
                        ? 'bg-emerald-500'
                        : isDark
                          ? 'bg-white/5'
                          : 'bg-slate-200'
                    }`}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* 차트 그리드 */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Subject 1 차트 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-4">
              <span
                className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Subject <span className="text-indigo-500">01</span>
              </span>
              {state === 'SUBJECT_1_MEASURING' ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  MEASURING
                </div>
              ) : null}
              {state === 'SUBJECT_1_DONE' ||
              state === 'SUBJECT_2_READY' ||
              state === 'SUBJECT_2_MEASURING' ||
              state === 'SUBJECT_2_DONE' ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                  <CheckCircle2 size={12} />
                  DONE
                </div>
              ) : null}
            </div>
            <div
              className={`p-6 rounded-[2.5rem] border backdrop-blur-sm ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <SignalRealtimeChart
                metrics={subject1Metrics}
                color="#6366f1"
                activeSubjectIndex={activeSubjectIndex}
                subjectIndex={1}
              />
            </div>
          </div>

          {/* Subject 2 차트 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-4">
              <span
                className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                Subject <span className="text-emerald-500">02</span>
              </span>
              {state === 'SUBJECT_2_MEASURING' ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  MEASURING
                </div>
              ) : null}
            </div>
            <div
              className={`p-6 rounded-[2.5rem] border backdrop-blur-sm ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <SignalRealtimeChart
                metrics={subject2Metrics}
                color="#10b981"
                activeSubjectIndex={activeSubjectIndex}
                subjectIndex={2}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default SequentialFlow;
