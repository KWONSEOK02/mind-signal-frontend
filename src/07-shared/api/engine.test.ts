import { describe, it, expect, vi, beforeEach } from 'vitest';
import { engineApi } from './engine';

/**
 * Axios 인스턴스를 모킹하여 API 레이어를 네트워크에서 격리함
 * engine.ts는 api를 default import로 사용하므로 default 모킹 수행함
 */
vi.mock('./base', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import api from './base';
const mockPost = api.post as ReturnType<typeof vi.fn>;

describe('engineApi — 엔진 분석 API 통합 테스트 수행함', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzePipeline', () => {
    const mockPipelineResponse = {
      data: {
        groupId: 'group-123',
        subjects: [
          {
            subjectIndex: 0,
            baseline: { alpha: 0.5 },
            features: { alpha: 0.6 },
            nFeatures: 10,
          },
        ],
        pairFeatures: null,
        yScore: 0.75,
        synchronyScore: 0.8,
        pipelineParams: {
          stimulusDurationSec: 5,
          windowSizeSec: 1,
          nStimuli: 10,
          baselineDurationSec: 3,
          bandCols: ['alpha', 'beta'],
          nWindowsPerStimulus: 5,
          totalFeaturesPerSubject: 50,
        },
      },
    };

    it('POST /engine/analyze/pipeline 올바른 body 구성 처리함', async () => {
      mockPost.mockResolvedValue(mockPipelineResponse);

      await engineApi.analyzePipeline('group-123', [0, 1]);

      expect(mockPost).toHaveBeenCalledWith('/engine/analyze/pipeline', {
        groupId: 'group-123',
        subjectIndices: [0, 1],
        params: undefined,
        satisfactionScores: undefined,
        includeMarkdown: false,
      });
    });

    it('options 파라미터 전달 시 body에 포함 처리함', async () => {
      mockPost.mockResolvedValue(mockPipelineResponse);

      await engineApi.analyzePipeline('group-123', [0], {
        params: { stimulusDurationSec: 5, nStimuli: 10 },
        satisfactionScores: { 0: 4 },
        includeMarkdown: true,
      });

      expect(mockPost).toHaveBeenCalledWith('/engine/analyze/pipeline', {
        groupId: 'group-123',
        subjectIndices: [0],
        params: { stimulusDurationSec: 5, nStimuli: 10 },
        satisfactionScores: { 0: 4 },
        includeMarkdown: true,
      });
    });

    it('options 미전달 시 includeMarkdown 기본값 false 처리함', async () => {
      mockPost.mockResolvedValue(mockPipelineResponse);

      await engineApi.analyzePipeline('group-456', [0, 1]);

      const callArgs = mockPost.mock.calls[0][1];
      expect(callArgs.includeMarkdown).toBe(false);
    });

    it('성공 응답 반환 처리함', async () => {
      mockPost.mockResolvedValue(mockPipelineResponse);

      const result = await engineApi.analyzePipeline('group-123', [0]);

      expect(result.data.groupId).toBe('group-123');
      expect(result.data.yScore).toBe(0.75);
    });

    it('API 실패 시 에러 전파 처리함', async () => {
      mockPost.mockRejectedValue(new Error('Pipeline error'));

      await expect(engineApi.analyzePipeline('group-123', [0])).rejects.toThrow(
        'Pipeline error'
      );
    });
  });

  describe('stopAll', () => {
    const mockStopResponse = {
      data: {
        status: 'success' as const,
        stoppedCount: 2,
        allCompleted: true,
      },
    };

    it('POST /engine/stream/stop-all 올바른 body 구성 처리함', async () => {
      mockPost.mockResolvedValue(mockStopResponse);

      await engineApi.stopAll('group-123', 'ManualEarly');

      expect(mockPost).toHaveBeenCalledWith('/engine/stream/stop-all', {
        groupId: 'group-123',
        stopReason: 'ManualEarly',
      });
    });

    it('stopReason 미전달 시 기본값 ManualEarly 사용 처리함', async () => {
      mockPost.mockResolvedValue(mockStopResponse);

      await engineApi.stopAll('group-123');

      expect(mockPost).toHaveBeenCalledWith('/engine/stream/stop-all', {
        groupId: 'group-123',
        stopReason: 'ManualEarly',
      });
    });

    it('커스텀 stopReason 전달 처리함', async () => {
      mockPost.mockResolvedValue(mockStopResponse);

      await engineApi.stopAll('group-456', 'HeadsetLost');

      expect(mockPost).toHaveBeenCalledWith('/engine/stream/stop-all', {
        groupId: 'group-456',
        stopReason: 'HeadsetLost',
      });
    });

    it('성공 응답 반환 처리함', async () => {
      mockPost.mockResolvedValue(mockStopResponse);

      const result = await engineApi.stopAll('group-123');

      expect(result.data.status).toBe('success');
      expect(result.data.stoppedCount).toBe(2);
      expect(result.data.allCompleted).toBe(true);
    });

    it('API 실패 시 에러 전파 처리함', async () => {
      mockPost.mockRejectedValue(new Error('Stop failed'));

      await expect(engineApi.stopAll('group-123')).rejects.toThrow(
        'Stop failed'
      );
    });
  });
});
