'use client';

import React from 'react';
import SignalRealtimeChart from './signal-realtime-chart';
import { EmotivMetrics } from '@/07-shared/api';

interface SignalComparisonWidgetProps {
  hostMetrics: EmotivMetrics | null;
  participantMetrics: EmotivMetrics | null;
}

/**
 * [Widget] 호스트와 참가자의 차트를 1:1 비율로 배치하는 대칭 위젯임
 */
const SignalComparisonWidget: React.FC<SignalComparisonWidgetProps> = ({
  hostMetrics,
  participantMetrics,
}) => {
  return (
    /**
     * lg: 접두사를 제거하여 좁은 화면에서도 항상 grid-cols-2 대칭 유지함
     */
    <div className="grid grid-cols-2 gap-4 md:gap-8 w-full">
      {/* 호스트 데이터 시각화 영역임 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            Host Session
          </h3>
        </div>
        <SignalRealtimeChart data={hostMetrics} />
      </div>

      {/* 참가자 데이터 시각화 영역임 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
            Participant Session
          </h3>
        </div>
        <SignalRealtimeChart data={participantMetrics} />
      </div>
    </div>
  );
};

export default SignalComparisonWidget;
