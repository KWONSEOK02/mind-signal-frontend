'use client';

import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveOperatorSocketSession } from '@/07-shared/lib/operator-socket-session.lib';
import { OperatorStreamHealthBanner } from './operator-stream-health-banner.component';

const { mockSocket, socketControl } = vi.hoisted(() => ({
  mockSocket: {
    connected: true,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
  socketControl: {
    ackOk: true,
    ackError: '',
  },
}));

vi.mock('@/07-shared/lib/socket-client', () => ({
  getSocket: vi.fn(() => mockSocket),
}));

const saveValidSession = (groupId: string, token = 'socket-token') => {
  saveOperatorSocketSession(groupId, {
    socketToken: token,
    socketTokenExpiresAt: Date.now() + 60_000,
    experimentMode: 'DUAL_2PC',
  });
};

const getRegisteredHandler = (eventName: string) => {
  const matchingCall = mockSocket.on.mock.calls.find(
    ([registeredEvent]) => registeredEvent === eventName
  );
  const handler = matchingCall?.[1];
  if (typeof handler !== 'function') {
    throw new Error(`${eventName} handler 미등록`);
  }
  return handler;
};

describe('OperatorStreamHealthBanner 서버 경보 구독 처리함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSocket.connected = true;
    socketControl.ackOk = true;
    socketControl.ackError = '';
    mockSocket.emit.mockImplementation((_event, _payload, ack) => {
      if (typeof ack === 'function') {
        ack({
          ok: socketControl.ackOk,
          ...(socketControl.ackError ? { error: socketControl.ackError } : {}),
        });
      }
    });
  });

  it('저장 토큰으로 groupId와 token 객체를 emit 처리함', async () => {
    saveValidSession('group-a', 'operator-token-a');

    render(<OperatorStreamHealthBanner groupId="group-a" enabled />);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join-operator-room',
        {
          groupId: 'group-a',
          token: 'operator-token-a',
        },
        expect.any(Function)
      );
    });
  });

  it('ack 인증 실패 배너가 측정 제어를 차단하지 않음', async () => {
    saveValidSession('group-a');
    socketControl.ackOk = false;
    socketControl.ackError = 'unauthorized';

    render(
      <>
        <OperatorStreamHealthBanner groupId="group-a" enabled />
        <button type="button">실험 시작</button>
      </>
    );

    expect(
      await screen.findByText(
        /실험은 진행 중이나 스트림 경보 채널이 연결되지 않음/
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실험 시작' })).toBeEnabled();
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
  });

  it('stale 경보 표시 후 healthy recovered 수신 시 해제함', async () => {
    saveValidSession('group-a');
    render(<OperatorStreamHealthBanner groupId="group-a" enabled />);

    const streamHealthHandler = getRegisteredHandler('stream-health');
    act(() => {
      streamHealthHandler({
        groupId: 'group-a',
        subjectIndex: 1,
        status: 'stale',
        source: 'backend',
        silentMs: 20_100,
      });
    });

    expect(await screen.findByText('피실험자 01')).toBeInTheDocument();
    expect(screen.getByText(/신호 정지 · 백엔드 감지/)).toBeInTheDocument();

    act(() => {
      streamHealthHandler({
        groupId: 'group-a',
        subjectIndex: 1,
        status: 'healthy',
        recovered: true,
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('피실험자 01')).not.toBeInTheDocument();
    });
  });

  it('토큰 없음과 만료 상태에 경보 채널 배너 표시함', async () => {
    const { rerender } = render(
      <OperatorStreamHealthBanner groupId="group-missing" enabled />
    );

    expect(
      await screen.findByText(/운영자 소켓 토큰이 없음/)
    ).toBeInTheDocument();

    saveOperatorSocketSession('group-expired', {
      socketToken: 'expired-token',
      socketTokenExpiresAt: Date.now() - 1,
      experimentMode: 'DUAL_2PC',
    });
    rerender(<OperatorStreamHealthBanner groupId="group-expired" enabled />);

    expect(
      await screen.findByText(/운영자 소켓 토큰이 만료됨/)
    ).toBeInTheDocument();
  });

  it('groupId 변경 시 이전 이벤트 handler 참조로 정리함', async () => {
    saveValidSession('group-a', 'token-a');
    saveValidSession('group-b', 'token-b');

    const { rerender } = render(
      <OperatorStreamHealthBanner groupId="group-a" enabled />
    );
    const streamHealthHandler = getRegisteredHandler('stream-health');
    const connectHandler = getRegisteredHandler('connect');

    rerender(<OperatorStreamHealthBanner groupId="group-b" enabled />);

    await waitFor(() => {
      expect(mockSocket.off).toHaveBeenCalledWith(
        'stream-health',
        streamHealthHandler
      );
      expect(mockSocket.off).toHaveBeenCalledWith('connect', connectHandler);
    });
  });

  it('소켓 connect 이벤트마다 운영자 room 재합류 처리함', () => {
    saveValidSession('group-a');
    render(<OperatorStreamHealthBanner groupId="group-a" enabled />);

    const connectHandler = getRegisteredHandler('connect');
    act(() => connectHandler());

    expect(mockSocket.emit).toHaveBeenCalledTimes(2);
  });
});
