import api from './base';

/**
 * EMOTIV 가공 지표 구조 정의함
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
 * 실시간 측정 데이터 페이로드 정의함
 */
export interface RealtimeMeasurementPayload {
  sessionId: string;
  timestamp: number;
  metrics: EmotivMetrics;
}

/**
 * 측정 데이터 전송 응답 규격임
 */
export interface MeasurementResponse {
  status: 'success' | 'fail';
  message?: string;
}

/**
 * 실시간 신호 데이터 전송 API 모음임
 */
const signalApi = {
  /**
   * 가공된 지표 데이터를 Redis로 실시간 전송함
   * 이미지 명세를 준수하여 /measurements/realtime 엔드포인트 사용함
   */
  sendRealtimeData: (payload: RealtimeMeasurementPayload) =>
    api.post<MeasurementResponse>('/measurements/realtime', payload),
};

export default signalApi;
