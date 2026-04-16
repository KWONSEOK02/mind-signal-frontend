import api from './base';
import type { StopReason } from '@/07-shared/types';

// ──────────────────────────────────────────────
// POST /engine/analyze/pipeline 응답 타입 (전체 파이프라인)
// ──────────────────────────────────────────────

/** 파이프라인 파라미터 요청 타입 정의함 */
export interface PipelineParams {
  stimulusDurationSec?: number;
  windowSizeSec?: number;
  nStimuli?: number;
  baselineDurationSec?: number;
  bandCols?: string[];
}

/** 파이프라인 파라미터 응답 상세 타입 정의함 */
export interface PipelineParamsDetail {
  stimulusDurationSec: number;
  windowSizeSec: number;
  nStimuli: number;
  baselineDurationSec: number;
  bandCols: string[];
  nWindowsPerStimulus: number;
  totalFeaturesPerSubject: number;
}

/** 피실험자별 feature 추출 결과 타입 정의함 */
export interface SubjectFeatureResult {
  subjectIndex: number;
  baseline: Record<string, number>;
  features: Record<string, number>;
  nFeatures: number;
}

/** 전체 파이프라인 분석 응답 타입 정의함 */
export interface EnginePipelineResult {
  groupId: string;
  subjects: SubjectFeatureResult[];
  pairFeatures: Record<string, number> | null;
  yScore: number | null;
  synchronyScore: number | null;
  pipelineParams: PipelineParamsDetail;
  markdown?: string;
}

// ──────────────────────────────────────────────
// API 호출 함수
// ──────────────────────────────────────────────

/** stop-all 응답 타입 정의함 */
export interface StopAllResponse {
  status: 'success';
  stoppedCount: number;
  allCompleted: boolean;
}

/** 엔진 분석 API 함수 모음 정의함 */
export const engineApi = {
  /** 전체 파이프라인 분석 요청함 */
  analyzePipeline: (
    groupId: string,
    subjectIndices: number[],
    options?: {
      params?: PipelineParams;
      satisfactionScores?: Record<number, number>;
      includeMarkdown?: boolean;
    }
  ) =>
    api.post<EnginePipelineResult>('/engine/analyze/pipeline', {
      groupId,
      subjectIndices,
      params: options?.params,
      satisfactionScores: options?.satisfactionScores,
      includeMarkdown: options?.includeMarkdown ?? false,
    }),

  /** groupId 기준 전체 측정 중지 요청함 */
  stopAll: (groupId: string, stopReason: StopReason = 'ManualEarly') =>
    api.post<StopAllResponse>('/engine/stream/stop-all', {
      groupId,
      stopReason,
    }),
};
