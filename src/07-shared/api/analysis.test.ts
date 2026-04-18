import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analysisApi } from './analysis';

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
const mockGet = api.get as ReturnType<typeof vi.fn>;

describe('analysisApi — 분석 결과 API 통합 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getResult', () => {
    const mockResultData = {
      groupId: 'group-123',
      matchingScore: 87.5,
      synchronyScore: 0.72,
      yScore: 0.65,
      aiComment: '높은 집중도 관찰됨',
      markdown: '## 분석 결과',
      user1Name: '권석',
      user2Name: '테스트',
      isBTI: false,
      metricsMean: { focus: 0.8, stress: 0.3 },
      wavesMean: { alpha: 0.5, beta: 0.4 },
    };

    it('GET /analysis/{groupId} 올바른 URL 호출 처리함', async () => {
      mockGet.mockResolvedValue({
        data: { status: 'success', data: mockResultData },
      });

      await analysisApi.getResult('group-123');

      expect(mockGet).toHaveBeenCalledWith('/analysis/group-123');
    });

    it('응답 언래핑(.then(res => res.data)) 처리함', async () => {
      const responseBody = { status: 'success' as const, data: mockResultData };
      mockGet.mockResolvedValue({ data: responseBody });

      const result = await analysisApi.getResult('group-123');

      // res.data를 반환하므로 axios response 래퍼가 없는 body 직접 반환 검증함
      expect(result).toEqual(responseBody);
      expect(result.status).toBe('success');
      expect(result.data.groupId).toBe('group-123');
      expect(result.data.matchingScore).toBe(87.5);
    });

    it('groupId가 URL에 올바르게 보간 처리됨', async () => {
      mockGet.mockResolvedValue({
        data: { status: 'success', data: mockResultData },
      });

      await analysisApi.getResult('grp-xyz-999');

      expect(mockGet).toHaveBeenCalledWith('/analysis/grp-xyz-999');
    });

    it('API 실패 시 에러 전파 처리함', async () => {
      mockGet.mockRejectedValue(new Error('Analysis not found'));

      await expect(analysisApi.getResult('group-123')).rejects.toThrow(
        'Analysis not found'
      );
    });
  });
});
