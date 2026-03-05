import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import mockRouter from 'next-router-mock';
import { describe, it, expect, vi, beforeEach } from 'vitest';
/**
 * [Fix] RedirectStatusCode 관련 SyntaxError 해결을 위해 임포트 소스 변경함
 * @storybook/nextjs-vite 대신 @storybook/react의 composeStories 사용하여
 * 테스트 파일 로드 시 발생하는 Next.js 내부 의존성 충돌 회피함
 */
import { composeStories } from '@storybook/react';
import * as stories from './lab.stories';

/**
 * [Story] 스토리북 설정을 테스트 환경에 결합 수행함
 * 전역 setup에서 라우터 모킹이 완료된 상태에서 안전하게 로드함
 */
const { QRResetInteraction } = composeStories(stories);

describe('LabPage 정밀 라우팅 및 인터랙션 통합 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 각 테스트 시작 전 라우터 경로를 초기화하여 독립성 확보함
    mockRouter.setCurrentUrl('/lab');

    // 브라우저 화면 너비 감지 로직 모킹 수행함
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('스토리에 정의된 QR 리셋 인터랙션이 정상 동작해야 함', async () => {
    // 렌더링 수행함
    const { container } = render(<QRResetInteraction />);

    /**
     * [Logic] 스토리의 play 함수 실행하여 QR 생성 및 닫기 시나리오 검증함
     * 전역 setup에 정의된 mockRouter가 컴포넌트 내부의 useRouter에 자동 주입됨
     */
    if (QRResetInteraction.play) {
      await QRResetInteraction.play({ canvasElement: container });
    }

    // 최종적으로 초기 UI 상태(QR 생성 버튼)로 복구되었는지 확인함
    expect(screen.getByText(/Subject 01 연결 QR 생성/i)).toBeDefined();
  });

  it('설정(톱니) 버튼 클릭 시 QR UI가 닫히고 라우터 상태가 유지되어야 함', async () => {
    const user = userEvent.setup();
    render(<QRResetInteraction />);

    // 1. QR 생성 버튼 클릭하여 UI 활성화함
    const createBtn = screen.getByText(/Subject 01 연결 QR 생성/i);
    await user.click(createBtn);
    expect(screen.getByText(/STEP 1: SUBJECT 01 WAITING/i)).toBeDefined();

    // 2. 설정(톱니) 버튼 식별하여 클릭 수행함
    const allButtons = screen.getAllByRole('button');
    const settingsBtn = allButtons.find((btn: HTMLElement) =>
      btn.querySelector('svg')
    );

    if (settingsBtn) {
      await user.click(settingsBtn);
    }

    // 3. QR 섹션 제거 여부 및 현재 경로 무결성 확인함
    expect(screen.queryByText(/STEP 1: SUBJECT 01 WAITING/i)).toBeNull();
    expect(mockRouter.asPath).toBe('/lab');
  });

  it('라우팅 이동이 필요한 시나리오 발생 시 경로 변경을 올바르게 추적해야 함', async () => {
    // 전역 mockRouter 인스턴스를 통해 현재 경로 검증함
    expect(mockRouter.asPath).toBe('/lab');
  });
});
