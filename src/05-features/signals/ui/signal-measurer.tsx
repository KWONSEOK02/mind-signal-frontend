'use client';

import React from 'react';
import { Play, Square, Activity, Clock, Timer } from 'lucide-react';
import { MIN_ANALYSIS_SECONDS } from '@/07-shared/constants/experiment';

/**
 * 컴포넌트 Props 인터페이스 정의함
 */
interface SignalMeasurerProps {
  sessionId: string;
  isMeasuring: boolean;
  onStart: () => void;
  onStop: () => void;
  lastSentTime: string | null; // 타입을 number에서 string으로 변경함
  elapsedSeconds: number; // 측정 경과 시간(초) 데이터 사용함
}

/**
 * [Feature] 피실험자의 실시간 뇌파 측정 제어 및 상태 표시 컴포넌트 정의함
 */
const SignalMeasurer: React.FC<SignalMeasurerProps> = ({
  isMeasuring,
  onStart,
  onStop,
  lastSentTime,
  elapsedSeconds,
}) => {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-sm space-y-8">
      {/* 상태 헤더 영역 구성함 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${isMeasuring ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}
          >
            <Activity
              size={20}
              className={isMeasuring ? 'animate-pulse' : ''}
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Signal Status
            </h3>
            <p className="text-[10px] text-slate-500 font-medium uppercase">
              {isMeasuring ? 'Streaming Data...' : 'Ready to Measure'}
            </p>
          </div>
        </div>

        {/* 마지막 전송 시간 표시함 */}
        {lastSentTime && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <Clock size={12} className="text-slate-500" />
            <span className="text-[10px] font-mono text-slate-400">
              {lastSentTime}
            </span>
          </div>
        )}
      </div>

      {/* 제어 버튼 영역 구성함 */}
      <div className="grid grid-cols-1 gap-4">
        {!isMeasuring ? (
          <button
            onClick={onStart}
            className="group relative flex items-center justify-center gap-3 py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-500/20"
          >
            <Play size={20} fill="currentColor" />
            <span className="uppercase tracking-widest text-sm">
              측정 시작하기
            </span>
          </button>
        ) : (
          <>
            {/* 측정 경과 시간 타이머 표시함 — MIN_ANALYSIS_SECONDS 기준으로 색상 분기함 */}
            <div
              className={`flex items-center gap-1.5 font-mono text-lg font-black tracking-tighter ${elapsedSeconds >= MIN_ANALYSIS_SECONDS ? 'text-emerald-500' : 'text-rose-400'}`}
            >
              <Timer size={16} />
              <span>
                {Math.floor(elapsedSeconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={onStop}
              className="group flex items-center justify-center gap-3 py-6 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-2xl font-black transition-all duration-300 active:scale-[0.98]"
            >
              <Square size={20} fill="currentColor" />
              <span className="uppercase tracking-widest text-sm">
                측정 중지하기
              </span>
            </button>
          </>
        )}
      </div>

      {/* 안내 문구 영역 구성함 */}
      <p className="text-center text-[10px] text-slate-600 font-medium leading-relaxed">
        측정 시작 시 뇌파 데이터가 실시간으로 운영자 대시보드에 전송됨.
        <br />
        안정적인 데이터 전송을 위해 네트워크 상태를 확인해야 함.
      </p>
    </div>
  );
};

export default SignalMeasurer;
