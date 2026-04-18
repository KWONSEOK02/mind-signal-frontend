import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SignalRealtimeChart from './signal-realtime-chart';
import type { EmotivMetrics } from '@/07-shared/api';

/**
 * SignalRealtimeChart — activeSubjectIndex prop 테스트 수행함
 */
describe('SignalRealtimeChart', () => {
  const mockMetrics: EmotivMetrics = {
    engagement: 0.6,
    interest: 0.5,
    excitement: 0.4,
    stress: 0.3,
    relaxation: 0.7,
    focus: 0.8,
  };

  it('prop 없으면 DUAL 기본 동작으로 차트 렌더링 처리됨', () => {
    const { container } = render(
      <SignalRealtimeChart metrics={mockMetrics} color="#6366f1" />
    );
    // Recharts 컨테이너가 존재하면 차트 렌더링됨 확인함
    expect(
      container.querySelector('.recharts-responsive-container')
    ).not.toBeNull();
    // 숨김 대기 메시지가 없어야 함
    expect(screen.queryByText(/Waiting for turn/i)).toBeNull();
  });

  it('activeSubjectIndex=1, subjectIndex=1이면 차트 표시 처리됨', () => {
    const { container } = render(
      <SignalRealtimeChart
        metrics={mockMetrics}
        color="#6366f1"
        activeSubjectIndex={1}
        subjectIndex={1}
      />
    );
    expect(
      container.querySelector('.recharts-responsive-container')
    ).not.toBeNull();
    expect(screen.queryByText(/Waiting for turn/i)).toBeNull();
  });

  it('activeSubjectIndex=1, subjectIndex=2이면 차트 숨김 처리됨', () => {
    render(
      <SignalRealtimeChart
        metrics={mockMetrics}
        color="#f43f5e"
        activeSubjectIndex={1}
        subjectIndex={2}
      />
    );
    // 비활성 상태 대기 텍스트 존재 확인함
    expect(screen.getByText(/Waiting for turn/i)).toBeDefined();
    // Recharts 차트 레이블은 렌더링되지 않아야 함
    expect(screen.queryByText(/Engagement/i)).toBeNull();
  });

  it('activeSubjectIndex=2, subjectIndex=1이면 차트 숨김 처리됨', () => {
    render(
      <SignalRealtimeChart
        metrics={mockMetrics}
        color="#6366f1"
        activeSubjectIndex={2}
        subjectIndex={1}
      />
    );
    expect(screen.getByText(/Waiting for turn/i)).toBeDefined();
  });

  it('activeSubjectIndex만 있고 subjectIndex 없으면 차트 표시 처리됨 (DUAL 회귀)', () => {
    const { container } = render(
      <SignalRealtimeChart
        metrics={mockMetrics}
        color="#6366f1"
        activeSubjectIndex={1}
      />
    );
    // subjectIndex 없으면 isHidden=false → 차트 표시됨
    expect(
      container.querySelector('.recharts-responsive-container')
    ).not.toBeNull();
    expect(screen.queryByText(/Waiting for turn/i)).toBeNull();
  });

  it('metrics가 null이면 대기 스피너 렌더링 처리됨', () => {
    render(<SignalRealtimeChart metrics={null} color="#6366f1" />);
    expect(screen.getByText(/Synchronizing/i)).toBeDefined();
  });
});
