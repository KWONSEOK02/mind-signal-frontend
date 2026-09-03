'use client';

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { StreamEndBanner } from './stream-end-banner.component';

/** 20초 임계를 넘긴 과거 시각 — 매 호출 시점 기준으로 계산함 */
const staleAt = () => Date.now() - 30_000;
/**
 * 방금 수신한 시각.
 *
 * 모듈 로드 시각으로 고정하면 앞 테스트가 20초 넘게 걸린 실행에서 이 값이
 * stale 로 넘어가 판정이 뒤집힘 (CodeRabbit PR #83). 호출 시점에 계산함
 */
const freshAt = () => Date.now();

const BANNER_TEXT = /DE 자연 종료로 보입니다/;

describe('StreamEndBanner', () => {
  it('경과 시간을 넘기고 양쪽이 멈추면 배너를 표시함', () => {
    render(
      <StreamEndBanner
        enabled
        elapsedSeconds={300}
        lastSampleAt1={staleAt()}
        lastSampleAt2={staleAt()}
      />
    );

    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
  });

  it('최소 분석 시간 이전에는 표시하지 않음 — 초반 연결 지연을 종료로 오판 방지함', () => {
    render(
      <StreamEndBanner
        enabled
        elapsedSeconds={100}
        lastSampleAt1={staleAt()}
        lastSampleAt2={staleAt()}
      />
    );

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('한쪽만 멈추면 표시하지 않음 — 종료가 아니라 그쪽 헤드셋 문제임', () => {
    render(
      <StreamEndBanner
        enabled
        elapsedSeconds={300}
        lastSampleAt1={staleAt()}
        lastSampleAt2={freshAt()}
      />
    );

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('비활성일 때는 조건을 만족해도 표시하지 않음', () => {
    render(
      <StreamEndBanner
        enabled={false}
        elapsedSeconds={300}
        lastSampleAt1={staleAt()}
        lastSampleAt2={staleAt()}
      />
    );

    expect(screen.queryByText(BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('샘플을 한 번도 못 받은 상태도 멈춤으로 판정함', () => {
    render(
      <StreamEndBanner
        enabled
        elapsedSeconds={300}
        lastSampleAt1={null}
        lastSampleAt2={null}
      />
    );

    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
  });
});
