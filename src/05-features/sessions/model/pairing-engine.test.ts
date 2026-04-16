import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PairingStep } from './pairing-engine';

/**
 * sessionApi 모킹 — pairing-engine이 의존하는 API 레이어를 격리함
 */
vi.mock('@/07-shared', () => ({
  sessionApi: {
    createdPairing: vi.fn(),
    checkSessionStatus: vi.fn(),
  },
}));

// 모킹된 sessionApi 참조 획득함
import { sessionApi } from '@/07-shared';
const mockSessionApi = vi.mocked(sessionApi);

describe('PairingStep — 페어링 엔진 단위 테스트 수행함', () => {
  let engine: PairingStep;
  let onStatusUpdate: ReturnType<typeof vi.fn>;
  let onTimeUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new PairingStep();
    onStatusUpdate = vi.fn();
    onTimeUpdate = vi.fn();
  });

  afterEach(() => {
    engine.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('execute 성공 흐름', () => {
    const mockPairingData = {
      groupId: 'group-1',
      subjectIndex: 0,
      pairingToken: 'token-abc',
      expiresAt: new Date(Date.now() + 300_000).toISOString(), // 5분 후
    };

    beforeEach(() => {
      mockSessionApi.createdPairing.mockResolvedValue({
        data: { status: 'success', data: mockPairingData },
      } as never);
    });

    it('createdPairing API 호출 후 페어링 데이터를 반환 처리함', async () => {
      mockSessionApi.checkSessionStatus.mockResolvedValue({
        data: {
          data: {
            groupId: 'group-1',
            sessions: [
              { subjectIndex: 0, status: 'waiting', guestJoined: false },
            ],
          },
        },
      } as never);

      const result = await engine.execute(onStatusUpdate, onTimeUpdate);

      expect(mockSessionApi.createdPairing).toHaveBeenCalledOnce();
      expect(result).toEqual(mockPairingData);
    });

    it('groupId 전달 시 API에 해당 값을 포함하여 호출 처리함', async () => {
      mockSessionApi.checkSessionStatus.mockResolvedValue({
        data: {
          data: {
            groupId: 'group-1',
            sessions: [
              { subjectIndex: 0, status: 'waiting', guestJoined: false },
            ],
          },
        },
      } as never);

      await engine.execute(onStatusUpdate, onTimeUpdate, 'existing-group');

      expect(mockSessionApi.createdPairing).toHaveBeenCalledWith(
        'existing-group'
      );
    });

    it('타이머가 1초마다 남은 시간을 콜백으로 전달 처리함', async () => {
      mockSessionApi.checkSessionStatus.mockResolvedValue({
        data: {
          data: {
            groupId: 'group-1',
            sessions: [
              { subjectIndex: 0, status: 'waiting', guestJoined: false },
            ],
          },
        },
      } as never);

      await engine.execute(onStatusUpdate, onTimeUpdate);

      await vi.advanceTimersByTimeAsync(1000);
      expect(onTimeUpdate).toHaveBeenCalled();
      const firstCall = onTimeUpdate.mock.calls[0][0];
      expect(firstCall).toBeGreaterThan(290); // 약 299초
      expect(firstCall).toBeLessThanOrEqual(300);
    });

    it('폴링에서 guestJoined=true 감지 시 PAIRED 상태를 콜백 처리함', async () => {
      mockSessionApi.checkSessionStatus.mockResolvedValue({
        data: {
          data: {
            groupId: 'group-1',
            sessions: [
              { subjectIndex: 0, status: 'paired', guestJoined: true },
            ],
          },
        },
      } as never);

      await engine.execute(onStatusUpdate, onTimeUpdate);

      // 폴링 인터벌(3초) 진행
      await vi.advanceTimersByTimeAsync(3000);

      expect(onStatusUpdate).toHaveBeenCalledWith('PAIRED', mockPairingData);
    });
  });

  describe('만료 처리', () => {
    it('타이머 만료 시 EXPIRED 상태를 콜백 처리함', async () => {
      const expiredData = {
        groupId: 'group-1',
        subjectIndex: 0,
        pairingToken: 'token-abc',
        expiresAt: new Date(Date.now() + 2000).toISOString(), // 2초 후 만료
      };

      mockSessionApi.createdPairing.mockResolvedValue({
        data: { status: 'success', data: expiredData },
      } as never);
      mockSessionApi.checkSessionStatus.mockResolvedValue({
        data: {
          data: {
            groupId: 'group-1',
            sessions: [
              { subjectIndex: 0, status: 'waiting', guestJoined: false },
            ],
          },
        },
      } as never);

      await engine.execute(onStatusUpdate, onTimeUpdate);

      // 3초 진행 → 만료
      await vi.advanceTimersByTimeAsync(3000);

      expect(onStatusUpdate).toHaveBeenCalledWith('EXPIRED');
    });
  });

  describe('에러 처리', () => {
    it('createdPairing API 실패 시 ERROR 상태 콜백 + 예외 throw 처리함', async () => {
      mockSessionApi.createdPairing.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        engine.execute(onStatusUpdate, onTimeUpdate)
      ).rejects.toThrow('Network error');

      expect(onStatusUpdate).toHaveBeenCalledWith('ERROR');
    });

    it('폴링 중 401 응답 시 EXPIRED 상태로 전환 처리함', async () => {
      const mockData = {
        groupId: 'group-1',
        subjectIndex: 0,
        pairingToken: 'token-abc',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      };

      mockSessionApi.createdPairing.mockResolvedValue({
        data: { status: 'success', data: mockData },
      } as never);

      const axiosError = new Error('Unauthorized') as Error & {
        response: { status: number };
      };
      axiosError.response = { status: 401 };
      mockSessionApi.checkSessionStatus.mockRejectedValue(axiosError);

      await engine.execute(onStatusUpdate, onTimeUpdate);
      await vi.advanceTimersByTimeAsync(3000);

      expect(onStatusUpdate).toHaveBeenCalledWith('EXPIRED');
    });

    it('폴링 중 410 응답 시 EXPIRED 상태로 전환 처리함', async () => {
      const mockData = {
        groupId: 'group-1',
        subjectIndex: 0,
        pairingToken: 'token-abc',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      };

      mockSessionApi.createdPairing.mockResolvedValue({
        data: { status: 'success', data: mockData },
      } as never);

      const axiosError = new Error('Gone') as Error & {
        response: { status: number };
      };
      axiosError.response = { status: 410 };
      mockSessionApi.checkSessionStatus.mockRejectedValue(axiosError);

      await engine.execute(onStatusUpdate, onTimeUpdate);
      await vi.advanceTimersByTimeAsync(3000);

      expect(onStatusUpdate).toHaveBeenCalledWith('EXPIRED');
    });
  });

  describe('clear 자원 해제', () => {
    it('clear 호출 시 타이머와 폴링이 모두 정지 처리함', async () => {
      const mockData = {
        groupId: 'group-1',
        subjectIndex: 0,
        pairingToken: 'token-abc',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      };

      mockSessionApi.createdPairing.mockResolvedValue({
        data: { status: 'success', data: mockData },
      } as never);
      mockSessionApi.checkSessionStatus.mockResolvedValue({
        data: {
          data: {
            groupId: 'group-1',
            sessions: [
              { subjectIndex: 0, status: 'waiting', guestJoined: false },
            ],
          },
        },
      } as never);

      await engine.execute(onStatusUpdate, onTimeUpdate);
      engine.clear();

      // clear 후 타이머 진행해도 콜백 호출 안 됨
      onTimeUpdate.mockClear();
      onStatusUpdate.mockClear();
      await vi.advanceTimersByTimeAsync(5000);

      expect(onTimeUpdate).not.toHaveBeenCalled();
    });
  });
});
