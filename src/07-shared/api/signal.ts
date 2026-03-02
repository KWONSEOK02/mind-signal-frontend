import { api } from './base';
import { AxiosResponse } from 'axios';

/**
 * EMOTIV 가공 지표 구조 정의함
 * 위젯 및 차트에서 실시간 렌더링의 기준 데이터로 사용함
 */
export interface EmotivMetrics {
  engagement: number;
  interest: number;
  excitement: number;
  stress: number;
  relaxation: number;
  focus: number;
}

/**
 * 뇌파 데이터 전송을 위한 페이로드 구조 정의함
 */
export interface SignalPayload {
  correlationId: string; // [groupId]_[subjectIndex] 형식의 식별자임
  metrics: EmotivMetrics;
}

/**
 * 서버 응답 규격 정의함
 */
export interface SignalResponse {
  status: 'success' | 'fail';
  message?: string;
  data?: unknown;
}

/**
 * 실시간 뇌파 신호 전송 관련 API 모음임
 */
const signalApi = {
  /**
   * 식별자(correlationId)를 기반으로 실시간 뇌파 데이터를 서버로 전송 수행함
   */
  sendSignal: (
    correlationId: string,
    metrics: EmotivMetrics
  ): Promise<AxiosResponse<SignalResponse>> =>
    api.post<SignalResponse>('/signals/realtime', {
      correlationId,
      metrics,
    }),

  /**
   * 특정 상관 식별자의 실시간 신호 상태 확인 수행함
   */
  getSignalStatus: (correlationId: string) =>
    api.get<SignalResponse>(`/signals/status/${correlationId}`),
};

export default signalApi;
