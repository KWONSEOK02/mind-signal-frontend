'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { EmotivMetrics } from '@/07-shared/api';

/**
 * 차트 위젯 Props 인터페이스 정의함
 */
interface SignalRealtimeChartProps {
  metrics: EmotivMetrics | null; // 기존 data에서 metrics로 명칭 변경함
  color: string; // 차트의 테마 색상 추가함
  /**
   * SEQUENTIAL 모드에서 현재 측정 중인 피실험자 인덱스 (1 또는 2)
   * subjectIndex가 activeSubjectIndex와 불일치하면 차트를 숨김
   * undefined이면 DUAL 기본 동작으로 양쪽 모두 표시함
   */
  activeSubjectIndex?: 1 | 2;
  /**
   * 이 차트가 담당하는 피실험자 인덱스 (1 또는 2)
   * activeSubjectIndex와 함께 사용하여 비활성 피실험자 차트를 숨김
   */
  subjectIndex?: 1 | 2;
}

/**
 * [Widget] EMOTIV 지표 시각화를 위한 실시간 막대 차트 위젯임
 */
const SignalRealtimeChart: React.FC<SignalRealtimeChartProps> = ({
  metrics,
  color,
  activeSubjectIndex,
  subjectIndex,
}) => {
  // SEQUENTIAL 모드에서 비활성 피실험자 차트는 숨김 처리함
  const isHidden =
    activeSubjectIndex !== undefined &&
    subjectIndex !== undefined &&
    activeSubjectIndex !== subjectIndex;
  /**
   * Recharts 규격에 맞게 실시간 지표 데이터를 포맷팅함
   */
  const chartData = metrics
    ? [
        {
          name: 'Engagement',
          value: Number((metrics.engagement * 100).toFixed(1)) || 0,
        },
        {
          name: 'Interest',
          value: Number((metrics.interest * 100).toFixed(1)) || 0,
        },
        {
          name: 'Excitement',
          value: Number((metrics.excitement * 100).toFixed(1)) || 0,
        },
        {
          name: 'Stress',
          value: Number((metrics.stress * 100).toFixed(1)) || 0,
        },
        {
          name: 'Relaxation',
          value: Number((metrics.relaxation * 100).toFixed(1)) || 0,
        },
        {
          name: 'Focus',
          value: Number((metrics.focus * 100).toFixed(1)) || 0,
        },
      ]
    : [];

  // 비활성 상태이면 빈 대기 화면 반환함
  if (isHidden) {
    return (
      <div className="w-full h-[400px] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-white/5 border-t-white/20 rounded-full opacity-20" />
        <p className="text-[10px] font-bold text-slate-700 tracking-widest uppercase">
          Waiting for turn...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px]">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              horizontal={false}
            />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
              width={90}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                fontSize: '12px',
              }}
              itemStyle={{ fontWeight: 'bold' }}
            />
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              barSize={20}
              isAnimationActive={true}
              animationDuration={300}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={color} // 전달받은 테마 색상 적용함
                  fillOpacity={1 - index * 0.1} // 시각적 깊이를 위해 투명도 차등 적용함
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="w-12 h-12 border-4 border-white/5 border-t-white/20 rounded-full animate-spin" />
          <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">
            Synchronizing...
          </p>
        </div>
      )}
    </div>
  );
};

export default SignalRealtimeChart;
