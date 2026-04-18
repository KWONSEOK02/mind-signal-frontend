import { api } from './base';

/** 분석 결과 응답 타입 정의함 */
export interface AnalysisResultData {
  groupId: string;
  matchingScore: number;
  synchronyScore: number | null;
  yScore: number | null;
  aiComment: string;
  markdown: string;
  user1Name: string | null;
  user2Name: string | null;
  isBTI: boolean;
  metricsMean: Record<string, number> | null;
  wavesMean: Record<string, number> | null;
  /** 분석 모드 식별자 — SEQUENTIAL이면 similarity_features 사용함 */
  analysis_mode?: 'DUAL' | 'SEQUENTIAL' | 'BTI';
  /** SEQUENTIAL 모드 유사도 특징 벡터 — Zod parse 전 원본 보관함 */
  similarity_features?: Record<string, unknown>;
}

export interface AnalysisResultResponse {
  status: 'success' | 'fail';
  data: AnalysisResultData;
}

/** 내 실험 결과 목록 항목 타입 정의함 */
export interface MyResultItem {
  groupId: string;
  matchingScore: number;
  user1Name: string | null;
  user2Name: string | null;
  createdAt: string | null;
}

/** 내 실험 결과 목록 응답 타입 정의함 */
export interface MyResultsResponse {
  status: string;
  data: MyResultItem[];
}

/** SEQUENTIAL 분석 요청 body 타입 정의함 */
export interface SequentialAnalysisRequest {
  groupId: string;
  algorithm?: string;
}

/** SEQUENTIAL 분석 응답 타입 정의함 */
export interface SequentialAnalysisResponse {
  success: boolean;
  result: AnalysisResultData;
}

/** 분석 결과 조회 API 정의함 */
export const analysisApi = {
  /** groupId로 분석 결과 조회함 */
  getResult: (groupId: string) =>
    api
      .get<AnalysisResultResponse>(`/analysis/${groupId}`)
      .then((res) => res.data),

  /** 내 실험 결과 목록 조회함 */
  getMyResults: () =>
    api.get<MyResultsResponse>('/analysis/my').then((res) => res.data),

  /** SEQUENTIAL 분석 요청 수행함 */
  postSequentialAnalysis: (groupId: string, algorithm?: string) =>
    api
      .post<SequentialAnalysisResponse>('/api/analyze/sequential', {
        groupId,
        algorithm,
      } satisfies SequentialAnalysisRequest)
      .then((res) => res.data),
};
