import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import mockRouter from 'next-router-mock';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { composeStories } from '@storybook/react';
import * as stories from './lab.stories';
import { sessionApi } from '@/07-shared/api';
import { AxiosResponse } from 'axios';
import { PairingResponse, GroupStatusResponse } from '@/07-shared/api/session';

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
      btn.querySelector('svg.lucide-settings')
    );
    if (settingsBtn) {
      await user.click(settingsBtn);
    }

    // 3. QR 컴포넌트가 언마운트되었는지 검증함
    expect(screen.queryByText(/STEP 1: SUBJECT 01 WAITING/i)).toBeNull();
    // 4. 페이지 이탈 없이 LabPage에 머물러 있는지 검증함
    expect(mockRouter.asPath).toBe('/lab');
  });
});

describe('다중 페어링 상태 전이 및 완료 통합 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.setCurrentUrl('/lab');

    // 폴링(setInterval) 및 비동기 상태 업데이트를 제어하기 위해 Fake Timers 활성화함
    vi.useFakeTimers();

    // API 기본 응답 모킹 수행함 (any 타입 제거 및 unknown을 거친 구체적 타입 단언 적용함)
    vi.spyOn(sessionApi, 'createdPairing').mockImplementation(
      (groupId?: string) => {
        return Promise.resolve({
          data: {
            status: 'success',
            data: {
              groupId: 'TEST_GROUP',
              // groupId 인자가 있으면 기존 그룹에 추가되는 2번 참가자, 없으면 1번 참가자로 모킹함
              subjectIndex: groupId ? 2 : 1,
              pairingToken: 'ABCDEF',
              expiresAt: new Date(Date.now() + 300000).toISOString(),
            },
          },
        } as unknown as AxiosResponse<PairingResponse>);
      }
    );

    // 초기에는 아무도 접속하지 않은 상태로 모킹함
    vi.spyOn(sessionApi, 'checkSessionStatus').mockResolvedValue({
      data: {
        status: 'success',
        data: {
          groupId: 'TEST_GROUP',
          sessions: [],
        },
      },
    } as unknown as AxiosResponse<GroupStatusResponse>);
  });

  afterEach(() => {
    // 테스트 종료 후 실제 타이머로 복구함
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('첫 번째 사용자가 연결되었을 때, 두 번째 사용자의 QR 생성 UI가 자동 노출되어야 함', async () => {
    render(<QRResetInteraction />);

    // 1. QR 생성 버튼 클릭하여 1번 참가자 페어링 시작함
    const createBtn = screen.getByText(/Subject 01 연결 QR 생성/i);
    fireEvent.click(createBtn);

    // 가짜 타이머와 waitFor 충돌 방지를 위해 명시적으로 비동기 태스크 및 타이머 진행함
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByText(/STEP 1: SUBJECT 01 WAITING/i)).toBeDefined();

    // 2. 1번 참가자 연결 완료 상태로 API 모킹 변경함
    vi.spyOn(sessionApi, 'checkSessionStatus').mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          groupId: 'TEST_GROUP',
          sessions: [{ subjectIndex: 1, status: 'PAIRED', guestJoined: true }],
        },
      },
    } as unknown as AxiosResponse<GroupStatusResponse>);

    // 3. 폴링 주기(3초) 및 상태 업데이트(비동기 setTimeout) 진행함
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    // 4. 2번 참가자 대기 화면으로 자동 전환되었는지 검증함
    expect(screen.getByText(/STEP 2: SUBJECT 02 WAITING/i)).toBeDefined();
  });

  it('두 사용자 모두 페어링이 완료되었을 때 실험 시작 버튼이 노출되어야 함', async () => {
    render(<QRResetInteraction />);

    // 1. 1번 참가자 페어링 시작함
    fireEvent.click(screen.getByText(/Subject 01 연결 QR 생성/i));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // 2. 1번 참가자 연결 완료 모킹 및 시간 경과함
    vi.spyOn(sessionApi, 'checkSessionStatus').mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          groupId: 'TEST_GROUP',
          sessions: [{ subjectIndex: 1, status: 'PAIRED', guestJoined: true }],
        },
      },
    } as unknown as AxiosResponse<GroupStatusResponse>);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    // 2번 참가자 화면 전환 검증함
    expect(screen.getByText(/STEP 2: SUBJECT 02 WAITING/i)).toBeDefined();

    // 3. 2번 참가자까지 연결 완료 모킹 및 시간 경과함
    vi.spyOn(sessionApi, 'checkSessionStatus').mockResolvedValueOnce({
      data: {
        status: 'success',
        data: {
          groupId: 'TEST_GROUP',
          sessions: [
            { subjectIndex: 1, status: 'PAIRED', guestJoined: true },
            { subjectIndex: 2, status: 'PAIRED', guestJoined: true },
          ],
        },
      },
    } as unknown as AxiosResponse<GroupStatusResponse>);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    // 4. 최종적으로 QR 컴포넌트가 사라지고 '실험 시작' 버튼이 노출되는지 검증함
    expect(screen.queryByText(/WAITING/)).toBeNull();
    expect(screen.getByRole('button', { name: /실험 시작/i })).toBeDefined();
    expect(screen.getByText(/Experiment Ready/i)).toBeDefined();
  });
});
