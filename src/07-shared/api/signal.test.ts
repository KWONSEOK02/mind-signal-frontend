import { describe, it, expect, vi, beforeEach } from 'vitest';
import measurementApi from './signal';

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

describe('measurementApi — EEG 측정 API 통합 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startMeasurement', () => {
    it('POST /measurements/sessions/{id}/eeg/stream:start 올바른 URL 호출 처리함', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'success', measuredAt: '2026-04-16T12:00:00Z' },
      });

      const result = await measurementApi.startMeasurement('session-abc');

      expect(mockPost).toHaveBeenCalledWith(
        '/measurements/sessions/session-abc/eeg/stream:start'
      );
      expect(result.data.status).toBe('success');
    });

    it('세션 ID가 URL에 올바르게 보간 처리됨', async () => {
      mockPost.mockResolvedValue({
        data: { status: 'success' },
      });

      await measurementApi.startMeasurement('sess-999');

      expect(mockPost).toHaveBeenCalledWith(
        '/measurements/sessions/sess-999/eeg/stream:start'
      );
    });

    it('성공 응답 반환 처리함', async () => {
      const mockResponse = {
        data: {
          status: 'success' as const,
          message: '측정 시작됨',
          measuredAt: '2026-04-16T10:00:00Z',
        },
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await measurementApi.startMeasurement('session-abc');

      expect(result.data.status).toBe('success');
      expect(result.data.message).toBe('측정 시작됨');
      expect(result.data.measuredAt).toBe('2026-04-16T10:00:00Z');
    });

    it('API 실패 시 에러 전파 처리함', async () => {
      mockPost.mockRejectedValue(new Error('Stream start failed'));

      await expect(
        measurementApi.startMeasurement('session-abc')
      ).rejects.toThrow('Stream start failed');
    });
  });
});
