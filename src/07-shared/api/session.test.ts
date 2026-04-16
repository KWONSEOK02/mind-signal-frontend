import { describe, it, expect, vi, beforeEach } from 'vitest';
import sessionApi from './session';

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
