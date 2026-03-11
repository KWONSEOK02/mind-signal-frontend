'use client';

import React from 'react';
import { Activity, User, MonitorDot } from 'lucide-react';
import { EmotivMetrics } from '@/07-shared/api'; // 타입 임포트 수행함
import SignalRealtimeChart from './signal-realtime-chart';
import { useUI } from '@/app/providers/ui-context'; //라이트, 다트모드를 위해 useUI 임포트

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
const SignalPlaceholder = ({
  label,
  isDark,
}: {
  label: string;
  isDark: boolean;
}) => (
  // ⭐ 배경색과 테두리를 테마에 맞게 변경
  <div
    className={`flex flex-col items-center justify-center h-[300px] rounded-[2rem] border border-dashed relative overflow-hidden group transition-colors duration-500 ${
      isDark
        ? 'bg-white/[0.02] border-white/5'
        : 'bg-slate-100 border-slate-300'
    }`}
  >
    <div
      className={`absolute inset-0 animate-pulse ${isDark ? 'bg-indigo-500/5' : 'bg-indigo-500/10'}`}
    />
    <div className="relative flex flex-col items-center gap-4">
      {/* ⭐ 아이콘 박스 색상 변경 */}
      <div
        className={`p-4 rounded-full border transition-transform duration-500 group-hover:scale-110 ${
          isDark
            ? 'bg-slate-900 border-white/10 text-slate-500'
            : 'bg-white border-slate-200 text-slate-400'
        }`}
      >
        <MonitorDot size={32} className="animate-bounce" />
      </div>
      <div className="text-center space-y-1">
        {/* ⭐ 라벨 글자색 변경 */}
        <p
          className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          {label}
        </p>
        <p className="text-xs text-slate-500">연결 대기 중임</p>
      </div>
    </div>
  </div>
);

/**
 * [Widget] 피실험자 2인의 뇌파 데이터를 실시간으로 대조 분석하는 위젯
 */
const SignalComparisonWidget = ({
  subject1Metrics,
  subject2Metrics,
}: SignalComparisonWidgetProps) => {
  // ⭐ 전역 UI 상태에서 theme 가져와서 isDark 판단
  const { theme } = useUI();
  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* 피실험자 1 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* ⭐ 아이콘 배경색 변경 */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isDark
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              <User size={16} />
            </div>
            {/* ⭐ [핵심] Subject 글자색 수정! */}
            <span
              className={`text-sm font-black uppercase tracking-tighter transition-colors ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
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
          // ⭐ 차트 배경 박스 테마 적용
          <div
            className={`p-6 rounded-[2.5rem] border backdrop-blur-sm transition-all duration-500 ${
              isDark
                ? 'bg-white/[0.03] border-white/10'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <SignalRealtimeChart metrics={subject1Metrics} color="#6366f1" />
          </div>
        ) : (
          <SignalPlaceholder label="Subject 01" isDark={isDark} />
        )}
      </div>

      {/* 피실험자 2 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* ⭐ 아이콘 배경색 변경 */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isDark
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              <User size={16} />
            </div>
            {/* ⭐ [핵심] Subject 글자색 수정! */}
            <span
              className={`text-sm font-black uppercase tracking-tighter transition-colors ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
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
          // ⭐ 차트 배경 박스 테마 적용
          <div
            className={`p-6 rounded-[2.5rem] border backdrop-blur-sm transition-all duration-500 ${
              isDark
                ? 'bg-white/[0.03] border-white/10'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <SignalRealtimeChart metrics={subject2Metrics} color="#f43f5e" />
          </div>
        ) : (
          <SignalPlaceholder label="Subject 02" isDark={isDark} />
        )}
      </div>
    </div>
  );
};

export default SignalComparisonWidget;
