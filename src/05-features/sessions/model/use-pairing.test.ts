import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SESSION_STATUS } from '@/07-shared';

/**
 * sessionApi 모킹 — use-pairing이 의존하는 API 레이어를 격리함
 */
vi.mock('@/07-shared/api', () => ({
  sessionApi: {
    verifyPairing: vi.fn(),
  },
}));

/**
 * PairingStep 모킹 — pairing-engine 복잡한 타이머/폴링 로직을 격리함
 */
vi.mock('./pairing-engine', () => {
  const mockExecute = vi.fn().mockResolvedValue({
    groupId: 'group-mock',
    pairingToken: 'token-mock',
    subjectIndex: 0,
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
  });
  const mockClear = vi.fn();

  class PairingStep {
    execute = mockExecute;
    clear = mockClear;
  }

  return { PairingStep };
});

// 모킹된 sessionApi 참조 획득함
import { sessionApi } from '@/07-shared/api';
const mockVerifyPairing = sessionApi.verifyPairing as ReturnType<typeof vi.fn>;

import usePairing from './use-pairing';

// 성공 응답 픽스처 정의함
const mockSuccessResponse = {
  data: {
    status: 'success',
    data: {
      id: 'session-id-123',
      groupId: 'group-abc',
      pairingToken: 'token-xyz',
      userId: 'user-1',
      role: 'SUBJECT' as const,
      subjectIndex: 1,
      status: SESSION_STATUS.PAIRED,
      pairedAt: null,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      measuredAt: null,
    },
  },
};

describe('usePairing — 페어링 훅 단위 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────
  // 1. 초기 상태 검증
  // ──────────────────────────────────────────────────────────
  describe('초기 상태 검증', () => {
    it('status가 IDLE로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.status).toBe(SESSION_STATUS.IDLE);
    });

    it('groupId가 null로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.groupId).toBeNull();
    });

    it('pairingCode가 null로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.pairingCode).toBeNull();
    });

    it('role이 null로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.role).toBeNull();
    });

    it('subjectIndex가 null로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.subjectIndex).toBeNull();
    });

    it('timeLeft가 300으로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.timeLeft).toBe(300);
    });

    it('pairedSubjects가 빈 배열로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.pairedSubjects).toEqual([]);
    });

    it('sessions가 빈 배열로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.sessions).toEqual([]);
    });

    it('sessionId가 null로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.sessionId).toBeNull();
    });

    it('isAllPaired가 false로 초기화 처리됨', () => {
      const { result } = renderHook(() => usePairing(2));
      expect(result.current.isAllPaired).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. requestPairing — Subject 플로우
  // ──────────────────────────────────────────────────────────
  describe('requestPairing — Subject 플로우 검증', () => {
    it('성공 응답 시 status가 PAIRED로 전환 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      expect(result.current.status).toBe(SESSION_STATUS.PAIRED);
    });

    it('성공 응답 시 role이 SUBJECT로 설정 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      expect(result.current.role).toBe('SUBJECT');
    });

    it('성공 응답 시 groupId가 응답 값으로 설정 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      expect(result.current.groupId).toBe('group-abc');
    });

    it('성공 응답 시 sessionId가 응답 data.id로 설정 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      expect(result.current.sessionId).toBe('session-id-123');
    });

    it('성공 응답 시 subjectIndex가 응답 값으로 설정 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      expect(result.current.subjectIndex).toBe(1);
    });

    it('성공 시 success: true 반환 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      let returnValue: Awaited<
        ReturnType<typeof result.current.requestPairing>
      >;
      await act(async () => {
        returnValue = await result.current.requestPairing('valid-token');
      });

      expect(returnValue!).toEqual({ success: true });
    });

    it('410 에러 응답 시 status가 EXPIRED로 전환 처리됨', async () => {
      const axiosError = new Error('Gone') as Error & {
        response: { status: number };
      };
      axiosError.response = { status: 410 };
      mockVerifyPairing.mockRejectedValue(axiosError);

      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('expired-token');
      });

      expect(result.current.status).toBe(SESSION_STATUS.EXPIRED);
    });

    it('401 에러 응답 시 status가 EXPIRED로 전환 처리됨', async () => {
      const axiosError = new Error('Unauthorized') as Error & {
        response: { status: number };
      };
      axiosError.response = { status: 401 };
      mockVerifyPairing.mockRejectedValue(axiosError);

      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('unauthorized-token');
      });

      expect(result.current.status).toBe(SESSION_STATUS.EXPIRED);
    });

    it('500 에러 응답 시 status가 ERROR로 전환 처리됨', async () => {
      const axiosError = new Error('Internal Server Error') as Error & {
        response: { status: number };
      };
      axiosError.response = { status: 500 };
      mockVerifyPairing.mockRejectedValue(axiosError);

      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('bad-token');
      });

      expect(result.current.status).toBe(SESSION_STATUS.ERROR);
    });

    it('에러 시 success: false와 해당 status 반환 처리됨', async () => {
      const axiosError = new Error('Gone') as Error & {
        response: { status: number };
      };
      axiosError.response = { status: 410 };
      mockVerifyPairing.mockRejectedValue(axiosError);

      const { result } = renderHook(() => usePairing(2));

      let returnValue: Awaited<
        ReturnType<typeof result.current.requestPairing>
      >;
      await act(async () => {
        returnValue = await result.current.requestPairing('expired-token');
      });

      expect(returnValue!).toEqual({
        success: false,
        status: SESSION_STATUS.EXPIRED,
      });
    });

    it('verifyPairing API가 전달된 토큰으로 호출 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('test-token-123');
      });

      expect(mockVerifyPairing).toHaveBeenCalledWith('test-token-123');
    });

    it('subjectIndex 미포함 응답 시 subjectIndex가 1로 기본 설정 처리됨', async () => {
      const responseWithoutIndex = {
        data: {
          status: 'success',
          data: {
            ...mockSuccessResponse.data.data,
            subjectIndex: undefined,
          },
        },
      };
      mockVerifyPairing.mockResolvedValue(responseWithoutIndex);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      expect(result.current.subjectIndex).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. resetStatus — 상태 초기화
  // ──────────────────────────────────────────────────────────
  describe('resetStatus — 상태 초기화 검증', () => {
    it('성공 상태 이후 resetStatus 호출 시 status가 IDLE로 복원 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      // 페어링 성공 → 상태 변경 수행함
      await act(async () => {
        await result.current.requestPairing('valid-token');
      });
      expect(result.current.status).toBe(SESSION_STATUS.PAIRED);

      // 초기화 수행함
      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.status).toBe(SESSION_STATUS.IDLE);
    });

    it('resetStatus 호출 시 groupId가 null로 복원 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.groupId).toBeNull();
    });

    it('resetStatus 호출 시 sessionId가 null로 복원 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.sessionId).toBeNull();
    });

    it('resetStatus 호출 후에도 role은 초기화되지 않고 기존 값을 유지함', async () => {
      // resetStatus 구현에 setRole 호출이 포함되지 않으므로 role은 유지됨
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });
      expect(result.current.role).toBe('SUBJECT');

      act(() => {
        result.current.resetStatus();
      });

      // resetStatus는 role을 초기화하지 않으므로 SUBJECT 유지 처리됨
      expect(result.current.role).toBe('SUBJECT');
    });

    it('resetStatus 호출 시 subjectIndex가 null로 복원 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.subjectIndex).toBeNull();
    });

    it('resetStatus 호출 시 pairingCode가 null로 복원 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.pairingCode).toBeNull();
    });

    it('resetStatus 호출 시 timeLeft가 300으로 복원 처리됨', async () => {
      mockVerifyPairing.mockResolvedValue(mockSuccessResponse);
      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('valid-token');
      });

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.timeLeft).toBe(300);
    });

    it('resetStatus 호출 시 pairedSubjects가 빈 배열로 복원 처리됨', async () => {
      const { result } = renderHook(() => usePairing(2));

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.pairedSubjects).toEqual([]);
    });

    it('resetStatus 호출 시 sessions가 빈 배열로 복원 처리됨', async () => {
      const { result } = renderHook(() => usePairing(2));

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.sessions).toEqual([]);
    });

    it('에러 상태 이후 resetStatus 호출 시 status가 IDLE로 복원 처리됨', async () => {
      const axiosError = new Error('Server Error') as Error & {
        response: { status: number };
      };
      axiosError.response = { status: 500 };
      mockVerifyPairing.mockRejectedValue(axiosError);

      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('bad-token');
      });
      expect(result.current.status).toBe(SESSION_STATUS.ERROR);

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.status).toBe(SESSION_STATUS.IDLE);
    });

    it('만료 상태 이후 resetStatus 호출 시 status가 IDLE로 복원 처리됨', async () => {
      const axiosError = new Error('Gone') as Error & {
        response: { status: number };
      };
      axiosError.response = { status: 410 };
      mockVerifyPairing.mockRejectedValue(axiosError);

      const { result } = renderHook(() => usePairing(2));

      await act(async () => {
        await result.current.requestPairing('expired-token');
      });
      expect(result.current.status).toBe(SESSION_STATUS.EXPIRED);

      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.status).toBe(SESSION_STATUS.IDLE);
    });
  });
});
