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
};
