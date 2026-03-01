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

interface SignalRealtimeChartProps {
  data: EmotivMetrics | null;
}

/**
 * [Widget] EMOTIV 지표 시각화를 위한 실시간 막대 차트 위젯임
 */
const SignalRealtimeChart: React.FC<SignalRealtimeChartProps> = ({ data }) => {
  /**
   * Recharts 규격에 맞게 지표 데이터를 포맷팅함
   */
  const chartData = data
    ? [
        {
          name: 'Engagement',
          value: Number((data.engagement * 100).toFixed(1)),
          color: '#6366f1',
        },
        {
          name: 'Interest',
          value: Number((data.interest * 100).toFixed(1)),
          color: '#8b5cf6',
        },
        {
          name: 'Excitement',
          value: Number((data.excitement * 100).toFixed(1)),
          color: '#ec4899',
        },
        {
          name: 'Stress',
          value: Number((data.stress * 100).toFixed(1)),
          color: '#f43f5e',
        },
        {
          name: 'Relaxation',
          value: Number((data.relaxation * 100).toFixed(1)),
          color: '#10b981',
        },
        {
          name: 'Focus',
          value: Number((data.focus * 100).toFixed(1)),
          color: '#f59e0b',
        },
      ]
    : [];

  return (
    <div className="w-full h-[400px] p-8 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-sm shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
          Real-time Performance Metrics
        </h4>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-indigo-500/40" />
        </div>
      </div>

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
              animationDuration={300} // 데이터 주기(100ms)를 고려한 부드러운 보간 설정함
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-600 tracking-tighter uppercase">
            Waiting for device stream...
          </p>
        </div>
      )}
    </div>
  );
};

export default SignalRealtimeChart;
