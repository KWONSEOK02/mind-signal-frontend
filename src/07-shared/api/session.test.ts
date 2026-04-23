import { describe, it, expect, vi, beforeEach } from 'vitest';
import sessionApi, {
  createOperatorInviteToken,
  joinAsOperator,
} from './session';

/**
 * Axios 인스턴스를 모킹하여 API 레이어를 네트워크에서 격리함
 * 실제 HTTP 요청 없이 요청 형식 + 응답 처리를 검증함
 */
vi.mock('./base', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from './base';
const mockPost = api.post as ReturnType<typeof vi.fn>;
const mockGet = api.get as ReturnType<typeof vi.fn>;

describe('sessionApi — 세션 API 통합 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createdPairing', () => {
    const mockResponse = {
      data: {
        status: 'success',
        data: {
          groupId: 'group-123',
          subjectIndex: 0,
          pairingToken: 'token-abc',
          expiresAt: '2026-04-16T12:00:00Z',
        },
      },
    };

    it('groupId 없이 호출 시 POST /sessions에 null groupId 전송 처리함', async () => {
      mockPost.mockResolvedValue(mockResponse);

      const result = await sessionApi.createdPairing();

      expect(mockPost).toHaveBeenCalledWith('/sessions', {
        groupId: null,
      });
      expect(result.data.data.groupId).toBe('group-123');
    });

    it('groupId 전달 시 해당 값을 POST body에 포함 처리함', async () => {
      mockPost.mockResolvedValue(mockResponse);

      await sessionApi.createdPairing('existing-group');

      expect(mockPost).toHaveBeenCalledWith('/sessions', {
        groupId: 'existing-group',
      });
    });

    it('API 실패 시 에러가 전파 처리됨', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      await expect(sessionApi.createdPairing()).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('verifyPairing', () => {
    it('토큰 기반 POST /sessions/{token}/pair 호출 처리함', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: {
            groupId: 'group-123',
            subjectIndex: 1,
            pairingToken: 'token-xyz',
          },
        },
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await sessionApi.verifyPairing('token-xyz');

      expect(mockPost).toHaveBeenCalledWith('/sessions/token-xyz/pair');
      expect(result.data.data.subjectIndex).toBe(1);
    });
  });

  describe('checkSessionStatus', () => {
    it('GET /sessions/group/{groupId}/status 호출 처리함', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: {
            groupId: 'group-123',
            sessions: [
              {
                subjectIndex: 0,
                status: 'paired',
                guestJoined: true,
              },
            ],
          },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await sessionApi.checkSessionStatus('group-123');

      expect(mockGet).toHaveBeenCalledWith('/sessions/group/group-123/status');
      expect(result.data.data.sessions[0].guestJoined).toBe(true);
    });

    it('그룹 미존재 시 에러가 전파 처리됨', async () => {
      mockGet.mockRejectedValue(new Error('Not found'));

      await expect(
        sessionApi.checkSessionStatus('nonexistent')
      ).rejects.toThrow('Not found');
    });
  });
});

/**
 * FE-1: createOperatorInviteToken / joinAsOperator API 클라이언트 테스트 수행함
 * 성공 / 403 / 401 / 네트워크 에러 처리 검증함
 */
describe('createOperatorInviteToken — operator-invite API 클라이언트 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('성공 시 POST /sessions/:groupId/invite-operator 호출 처리함', async () => {
    const expiresAt = Date.now() + 300_000;
    mockPost.mockResolvedValue({
      data: { token: 'jwt-invite-token', expiresAt },
    });

    const result = await createOperatorInviteToken('group-abc');

    expect(mockPost).toHaveBeenCalledWith(
      '/sessions/group-abc/invite-operator'
    );
    expect(result.token).toBe('jwt-invite-token');
    expect(result.expiresAt).toBe(expiresAt);
  });

  it('403 응답 시 에러가 전파 처리됨', async () => {
    const err = Object.assign(new Error('Forbidden'), {
      response: { status: 403 },
    });
    mockPost.mockRejectedValue(err);

    await expect(createOperatorInviteToken('group-abc')).rejects.toThrow(
      'Forbidden'
    );
    expect((err as { response: { status: number } }).response.status).toBe(403);
  });

  it('네트워크 에러 시 에러가 전파 처리됨', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    await expect(createOperatorInviteToken('group-abc')).rejects.toThrow(
      'Network Error'
    );
  });
});

describe('joinAsOperator — join-as-operator API 클라이언트 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('성공 시 POST /sessions/join-as-operator 호출 처리함', async () => {
    mockPost.mockResolvedValue({
      data: { groupId: 'group-xyz', experimentMode: 'DUAL_2PC' },
    });

    const result = await joinAsOperator('valid-jwt-token');

    expect(mockPost).toHaveBeenCalledWith('/sessions/join-as-operator', {
      token: 'valid-jwt-token',
    });
    expect(result.groupId).toBe('group-xyz');
    expect(result.experimentMode).toBe('DUAL_2PC');
  });

  it('401 응답 시 에러가 전파 처리됨 (만료 토큰)', async () => {
    const err = Object.assign(new Error('Unauthorized'), {
      response: { status: 401 },
    });
    mockPost.mockRejectedValue(err);

    await expect(joinAsOperator('expired-token')).rejects.toThrow(
      'Unauthorized'
    );
    expect((err as { response: { status: number } }).response.status).toBe(401);
  });

  it('네트워크 에러 시 에러가 전파 처리됨', async () => {
    mockPost.mockRejectedValue(new Error('Network Error'));

    await expect(joinAsOperator('some-token')).rejects.toThrow('Network Error');
  });
});
