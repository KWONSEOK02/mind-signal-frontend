/**
 * FE-banner: DualSessionBanner 컴포넌트 단위 테스트 수행함 (R9-M 1/3)
 *
 * 검증 범위:
 *   - experimentMode !== 'DUAL_2PC' → null 반환
 *   - state !== 'measuring' → null 반환
 *   - DUAL_2PC + measuring + partnerConnected=true → "연결됨" 텍스트 표시
 *   - DUAL_2PC + measuring + partnerConnected=false → "연결 대기" 텍스트 표시
 *   - invited / joining / ready / completed / aborted 상태에서 미렌더링
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DualSessionBanner } from './dual-session-banner.component';
import type { DualSessionState } from '@/05-features/sessions/model/use-dual-session';

describe('DualSessionBanner — 상태별 렌더링 테스트 수행함', () => {
  it('experimentMode가 DUAL_2PC 아니면 null 반환 처리됨', () => {
    const { container } = render(
      <DualSessionBanner
        experimentMode="SEQUENTIAL"
        state="measuring"
        partnerConnected={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('state가 measuring 아니면 null 반환 처리됨 (invited 상태)', () => {
    const { container } = render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state="invited"
        partnerConnected={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('state=joining이면 null 반환 처리됨', () => {
    const { container } = render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state="joining"
        partnerConnected={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('state=ready이면 null 반환 처리됨', () => {
    const { container } = render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state="ready"
        partnerConnected={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('state=completed이면 null 반환 처리됨', () => {
    const { container } = render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state="completed"
        partnerConnected={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('state=aborted이면 null 반환 처리됨', () => {
    const { container } = render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state="aborted"
        partnerConnected={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('DUAL_2PC + measuring + partnerConnected=true → 연결됨 텍스트 렌더링 처리됨', () => {
    render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state="measuring"
        partnerConnected={true}
      />
    );

    const banner = screen.getByRole('status');
    expect(banner).toBeDefined();
    expect(banner.textContent).toContain('DUAL 2PC 측정 중');
    expect(banner.textContent).toContain('연결됨');
  });

  it('DUAL_2PC + measuring + partnerConnected=false → 연결 대기 텍스트 렌더링 처리됨', () => {
    render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state="measuring"
        partnerConnected={false}
      />
    );

    const banner = screen.getByRole('status');
    expect(banner).toBeDefined();
    expect(banner.textContent).toContain('연결 대기');
  });

  it('배너에 aria-live=polite 속성 포함 처리됨', () => {
    render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state="measuring"
        partnerConnected={true}
      />
    );

    const banner = screen.getByRole('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it.each<DualSessionState>([
    'invited',
    'joining',
    'ready',
    'completed',
    'aborted',
  ])('DUAL_2PC + state=%s이면 배너 미렌더링 처리됨', (state) => {
    const { container } = render(
      <DualSessionBanner
        experimentMode="DUAL_2PC"
        state={state}
        partnerConnected={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
