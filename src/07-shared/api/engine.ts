import api from './base';

// ──────────────────────────────────────────────
// POST /engine/analyze 응답 타입 (기본 통계)
// ──────────────────────────────────────────────

/** Emotiv 6종 메트릭 키 타입 정의함 */
type MetricKey =
  | 'focus'
  | 'engagement'
  | 'interest'
  | 'excitement'
  | 'stress'
  | 'relaxation';

/** 5대역 뇌파 키 타입 정의함 */
type WaveBandKey = 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';

/** 피실험자 기본 통계 요약 타입 정의함 */
export interface EngineSubjectSummary {
  subjectIndex: number;
  metricsMean: Record<MetricKey, number>;
  metricsStd: Record<MetricKey, number>;
  wavesMean: Record<WaveBandKey, number>;
  totalSamples: number;
  durationSeconds: number;
  error?: string;
}

/** 기본 분석 응답 타입 정의함 */
export interface EngineAnalyzeResult {
  groupId: string;
  subjects: EngineSubjectSummary[];
  synchronyScore: number | null;
  markdown?: string;
}

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

/** 엔진 분석 API 함수 모음 정의함 */
export const engineApi = {
  /** 기본 통계 분석 요청함 */
  analyze: (
    groupId: string,
    subjectIndices: number[],
    includeMarkdown = false
  ) =>
    api.post<EngineAnalyzeResult>('/engine/analyze', {
      groupId,
      subjectIndices,
      includeMarkdown,
    }),

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
};
