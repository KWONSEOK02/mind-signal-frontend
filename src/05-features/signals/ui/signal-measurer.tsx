'use client';

import React from 'react';
// 표준 임포트 방식으로 변경하되 next.config.ts 설정으로 최적화함
import { Activity, Play, Square, Signal } from 'lucide-react';

interface SignalMeasurerProps {
  sessionId: string | null;
  isMeasuring: boolean;
  onStart: () => void;
  onStop: () => void;
  lastSentTime: number | null;
}

/**
 * [Feature] 실시간 측정 제어 및 상태 표시 컴포넌트임
 */
const SignalMeasurer: React.FC<SignalMeasurerProps> = ({
  sessionId,
  isMeasuring,
  onStart,
  onStop,
  lastSentTime,
}) => {
  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${isMeasuring ? 'bg-green-500/20 text-green-500' : 'bg-slate-800 text-slate-400'}`}
          >
            <Activity size={20} />
          </div>
          <h3 className="font-bold text-white">실시간 측정 제어</h3>
        </div>
        {isMeasuring && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse">
            <Signal size={14} />
            <span>REDIS RELAY ACTIVE</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-black/40 border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
            Last Update
          </p>
          <p className="font-mono text-sm text-slate-300">
            {lastSentTime
              ? new Date(lastSentTime).toLocaleTimeString()
              : 'WAITING FOR DATA'}
          </p>
        </div>

        {!isMeasuring ? (
          <button
            onClick={onStart}
            disabled={!sessionId}
            className="w-full py-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl font-bold transition-all active:scale-95"
          >
            <Play size={18} fill="currentColor" /> 측정 시작
          </button>
        ) : (
          <button
            onClick={onStop}
            className="w-full py-4 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/30 rounded-xl font-bold transition-all active:scale-95"
          >
            <Square size={18} fill="currentColor" /> 측정 중지
          </button>
        )}
      </div>
    </div>
  );
};

export default SignalMeasurer;
