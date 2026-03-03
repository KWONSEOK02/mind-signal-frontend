import { api } from './base';
import { PairingData } from '../types'; // 통합된 타입 참조함

/**
 * 백엔드 그룹 세션 공통 응답 규격 정의함
 */
export interface PairingResponse {
  status: 'success' | 'fail';
  data: PairingData; // 통합 엔티티 사용함
  message?: string;
}

/**
 * 그룹 기반 페어링 및 세션 관리 API 모음 정의함
 */
const sessionApi = {
  /**
   * 운영자용 새로운 그룹 실험 세션 생성 요청 수행함
   */
  createdPairing: (groupId?: string) => 
    api.post<PairingResponse>('/sessions', { groupId: groupId || null }),

  /**
   * 피실험자용 토큰 기반 그룹 합류 요청 수행함
   */
  verifyPairing: (pairingToken: string) =>
    api.post<PairingResponse>(`/sessions/${pairingToken}/pair`),

  /**
   * 그룹 내 참가자 입장 여부 및 실시간 상태 조회 수행함
   */
  checkSessionStatus: (groupId: string) =>
    api.get<PairingResponse>(`/sessions/group/${groupId}/status`),
};

export default sessionApi;