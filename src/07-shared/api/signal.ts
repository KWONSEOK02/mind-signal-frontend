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
 * 측정 시작 서버 응답 규격 정의함
 */
export interface MeasurementResponse {
  status: 'success' | 'fail';
  message?: string;
  measuredAt?: string;
}

/**
 * EEG 실시간 측정 관련 API 모음임
 * 최초 1회 HTTP POST로 Python 엔진 spawn 및 Redis 구독 트리거함
 */
const measurementApi = {
  /**
   * 세션 ID 기반으로 EEG 스트림 측정 시작 요청 수행함
   * 성공 시 백엔드가 Python 엔진을 spawn하고 Socket.io로 eeg-live 이벤트 전송 시작함
   */
  startMeasurement: (
    sessionId: string
  ): Promise<AxiosResponse<MeasurementResponse>> =>
    api.post<MeasurementResponse>(
      `/measurements/sessions/${sessionId}/eeg/stream:start`
    ),
};

export default measurementApi;
