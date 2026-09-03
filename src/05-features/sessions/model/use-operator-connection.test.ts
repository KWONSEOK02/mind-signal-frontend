'use client';

import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveOperatorSocketSession } from '@/07-shared/lib/operator-socket-session.lib';
import { useOperatorConnection } from './use-operator-connection';

const { mockCreateInvite, mockJoin } = vi.hoisted(() => ({
  mockCreateInvite: vi.fn(),
  mockJoin: vi.fn(),
}));

vi.mock('@/07-shared/api/session', () => ({
  createOperatorInviteToken: mockCreateInvite,
  joinAsOperator: mockJoin,
}));

const GROUP = 'group-a';

const okJoin = (expiresAt = Date.now() + 60_000) => ({
  groupId: GROUP,
  experimentMode: 'DUAL_2PC' as const,
  socketToken: 'fresh-token',
  socketTokenExpiresAt: expiresAt,
});

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('useOperatorConnection 운영자 채널 복원과 재연결 처리함', () => {
  it('groupId 없으면 idle 유지함', () => {
    const { result } = renderHook(() => useOperatorConnection(null));
    expect(result.current.status).toBe('idle');
    expect(result.current.session).toBeNull();
  });

  it('저장된 미만료 세션을 마운트 시 복원함', async () => {
    saveOperatorSocketSession(GROUP, {
      socketToken: 'stored-token',
      socketTokenExpiresAt: Date.now() + 60_000,
      experimentMode: 'DUAL_2PC',
    });

    const { result } = renderHook(() => useOperatorConnection(GROUP));

    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(result.current.session?.socketToken).toBe('stored-token');
  });

  /**
   * 만료를 null 로 뭉개면 배너의 expired-token 경로가 도달 불가가 되어 만료 신호가
   * 조용히 사라짐. UI-W006 T2 의 합격 조건임
   */
  it('저장 세션이 만료면 expired 로 구분하고 session 은 담지 않음', async () => {
    saveOperatorSocketSession(GROUP, {
      socketToken: 'old-token',
      socketTokenExpiresAt: Date.now() - 1,
      experimentMode: 'DUAL_2PC',
    });

    const { result } = renderHook(() => useOperatorConnection(GROUP));

    await waitFor(() => expect(result.current.status).toBe('expired'));
    expect(result.current.session).toBeNull();
  });

  it('connect 성공 시 토큰을 발급·교환해 저장하고 connected 로 전이함', async () => {
    mockCreateInvite.mockResolvedValue({ token: 't', expiresAt: 0 });
    mockJoin.mockResolvedValue(okJoin());

    const { result } = renderHook(() => useOperatorConnection(GROUP));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.connect();
    });

    expect(returned).toBe(true);
    expect(mockCreateInvite).toHaveBeenCalledWith(GROUP);
    expect(mockJoin).toHaveBeenCalledWith('t');
    expect(result.current.status).toBe('connected');
    expect(result.current.session?.socketToken).toBe('fresh-token');
  });

  it('connect 실패 시 BE 메시지를 우선 노출하고 error 로 전이함', async () => {
    mockCreateInvite.mockRejectedValue({
      response: { data: { message: '세션 생성자만 초대할 수 있습니다.' } },
    });

    const { result } = renderHook(() => useOperatorConnection(GROUP));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('세션 생성자만 초대할 수 있습니다.');
  });

  it('저장 실패가 연결 성공을 막지 않음', async () => {
    mockCreateInvite.mockResolvedValue({ token: 't', expiresAt: 0 });
    mockJoin.mockResolvedValue(okJoin());
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('blocked');
      });

    const { result } = renderHook(() => useOperatorConnection(GROUP));

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.connect();
    });

    expect(returned).toBe(true);
    expect(result.current.status).toBe('connected');
    setItemSpy.mockRestore();
  });
});

/**
 * CodeRabbit #85 반영 — 발급 세션 만료와 그룹별 오류 격리
 */
describe('useOperatorConnection CR — 만료와 그룹 격리', () => {
  it('발급 세션도 만료 시각이 지나면 expired 로 전이함', async () => {
    vi.useFakeTimers();
    try {
      mockCreateInvite.mockResolvedValue({ token: 't', expiresAt: 0 });
      mockJoin.mockResolvedValue(okJoin(Date.now() + 30 * 60_000));

      const { result } = renderHook(() => useOperatorConnection(GROUP));

      await act(async () => {
        await result.current.connect();
      });
      expect(result.current.status).toBe('connected');

      // 30분 경과 — 타이머가 재평가를 걸어야 함
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30 * 60_000 + 1);
      });

      expect(result.current.status).toBe('expired');
      expect(result.current.session).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('그룹 A 연결 실패 오류가 그룹 B 로 새지 않음', async () => {
    mockCreateInvite.mockRejectedValue({
      response: { data: { message: '그룹 A 거부됨' } },
    });

    const { result, rerender } = renderHook(
      ({ gid }: { gid: string }) => useOperatorConnection(gid),
      { initialProps: { gid: 'group-a' } }
    );

    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.error).toBe('그룹 A 거부됨');

    rerender({ gid: 'group-b' });

    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('idle');
  });
});
