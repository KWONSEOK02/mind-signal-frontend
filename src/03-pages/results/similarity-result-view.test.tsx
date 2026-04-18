import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SimilarityResultView from './similarity-result-view';
import type { CosinePearsonFaa } from '@/07-shared/schemas/similarity';

/**
 * SimilarityResultView 컴포넌트 단위 테스트 수행함
 */
describe('SimilarityResultView', () => {
  const mockData: CosinePearsonFaa = {
    algorithm: 'cosine_pearson_faa',
    similarity_score: 0.72,
    overall_cosine: 0.85,
    band_ratio_diff: {
      delta: 0.05,
      theta: -0.03,
      alpha: 0.12,
      beta: -0.07,
      gamma: 0.02,
    },
    faa_absolute_diff: 0.14,
  };

  it('similarity_score를 퍼센트로 렌더링 처리됨', () => {
    render(<SimilarityResultView data={mockData} />);
    // 72%로 표시 (0.72 * 100 = 72)
    expect(screen.getByText(/72/)).toBeDefined();
  });

  it('overall_cosine 값을 렌더링 처리됨', () => {
    render(<SimilarityResultView data={mockData} />);
    expect(screen.getByText(/0\.85/)).toBeDefined();
  });

  it('band_ratio_diff 각 대역 행을 렌더링 처리됨', () => {
    render(<SimilarityResultView data={mockData} />);
    expect(screen.getByText(/delta/i)).toBeDefined();
    expect(screen.getByText(/theta/i)).toBeDefined();
    expect(screen.getByText(/alpha/i)).toBeDefined();
    expect(screen.getByText(/beta/i)).toBeDefined();
    expect(screen.getByText(/gamma/i)).toBeDefined();
  });

  it('faa_absolute_diff 값을 렌더링 처리됨', () => {
    render(<SimilarityResultView data={mockData} />);
    expect(screen.getByText(/0\.14/)).toBeDefined();
  });

  it('faa_absolute_diff가 null이면 N/A 또는 없음 표시 처리됨', () => {
    const dataWithNull = { ...mockData, faa_absolute_diff: null };
    render(<SimilarityResultView data={dataWithNull} />);
    const matches = screen.getAllByText(/N\/A|없음/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});

/**
 * Zod 파싱 실패 시 fallback 렌더링 테스트 수행함
 */
describe('SimilarityResultView — fallback', () => {
  it('data가 null이면 fallback 메시지 렌더링 처리됨', () => {
    render(<SimilarityResultView data={null} />);
    expect(
      screen.getByText(/분석 결과 구조 변경 감지/i)
    ).toBeDefined();
  });
});
