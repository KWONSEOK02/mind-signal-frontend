'use client';

import React from 'react';
import { Activity, User, MonitorDot } from 'lucide-react';
import { EmotivMetrics } from '@/07-shared/api'; // 타입 임포트 수행함
import SignalRealtimeChart from './signal-realtime-chart';

/**
 * 위젯 Props 인터페이스 정의함
 */
interface SignalComparisonWidgetProps {
  subject1Metrics: EmotivMetrics | null; // any를 구체적인 타입으로 수정함
  subject2Metrics: EmotivMetrics | null; // any를 구체적인 타입으로 수정함
}

/**
 * 데이터 부재 시 표시할 플레이스홀더 컴포넌트임
 */
const SignalPlaceholder = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center h-[300px] rounded-[2rem] bg-white/[0.02] border border-white/5 border-dashed relative overflow-hidden group">
    <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
    <div className="relative flex flex-col items-center gap-4">
      <div className="p-4 rounded-full bg-slate-900 border border-white/10 text-slate-500 group-hover:scale-110 transition-transform duration-500">
        <MonitorDot size={32} className="animate-bounce" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-xs text-slate-600">연결 대기 중임</p>
      </div>
    </div>
  </div>
);

/**
 * [Widget] 피실험자 2인의 뇌파 데이터를 실시간으로 대조 분석하는 위젯 정의함
 */
const SignalComparisonWidget = ({
  subject1Metrics,
  subject2Metrics,
}: SignalComparisonWidgetProps) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* 피실험자 1 섹션 구성함 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <User size={16} />
            </div>
            <span className="text-sm font-black text-white uppercase tracking-tighter">
              Subject <span className="text-indigo-500">01</span>
            </span>
          </div>
          {subject1Metrics && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
              <Activity size={12} />
              <span>LIVE</span>
            </div>
          )}
        </div>

        {subject1Metrics ? (
          <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <SignalRealtimeChart metrics={subject1Metrics} color="#6366f1" />
          </div>
        ) : (
          <SignalPlaceholder label="Subject 01" />
        )}
      </div>

      {/* 피실험자 2 섹션 구성함 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
              <User size={16} />
            </div>
            <span className="text-sm font-black text-white uppercase tracking-tighter">
              Subject <span className="text-rose-500">02</span>
            </span>
          </div>
          {subject2Metrics && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
              <Activity size={12} />
              <span>LIVE</span>
            </div>
          )}
        </div>

        {subject2Metrics ? (
          <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-sm">
            <SignalRealtimeChart metrics={subject2Metrics} color="#f43f5e" />
          </div>
        ) : (
          <SignalPlaceholder label="Subject 02" />
        )}
      </div>
    </div>
  );
};

export default SignalComparisonWidget;
