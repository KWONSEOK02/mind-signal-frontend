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
 * 그룹 내 개별 세션 상태 인터페이스 정의함
 */
export interface GroupSessionStatus {
  subjectIndex: number;
  status: string;
  guestJoined: boolean;
  userName?: string;
  isMe?: boolean;
}

/**
 * 그룹 상태 조회 응답 데이터 규격 정의함
 */
export interface GroupStatusData {
  groupId: string;
  sessions: GroupSessionStatus[];
}

/**
 * 그룹 상태 조회 API 전체 응답 규격 정의함
 */
export interface GroupStatusResponse {
  status: 'success' | 'fail';
  data: GroupStatusData;
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
    api.get<GroupStatusResponse>(`/sessions/group/${groupId}/status`),
};

export default sessionApi;

/**
 * Operator 초대 토큰 발급 요청 수행함 (Phase 16 — BE-1-invite 연동)
 *
 * @param groupId - 그룹 식별자
 * @returns 초대 토큰 및 만료 시각 (Unix ms)
 * @throws ApiError 404 — 해당 groupId 세션 미존재 시
 */
export async function createOperatorInviteToken(
  groupId: string
): Promise<{ token: string; expiresAt: number }> {
  // POST /api/sessions/:groupId/invite-operator (authenticate 미들웨어 적용)
  const response = await api.post<{ token: string; expiresAt: number }>(
    `/sessions/${groupId}/invite-operator`
  );
  return response.data;
}

/**
 * Operator로 그룹 합류 요청 수행함 (Phase 16 — BE-1-join 연동)
 *
 * @param token - 초대 JWT 토큰 문자열
 * @returns 그룹 ID + 실험 모드 확인 응답
 * @throws ApiError 401 — 토큰 검증 실패 또는 만료 시
 */
export async function joinAsOperator(
  token: string
): Promise<{ groupId: string; experimentMode: 'DUAL_2PC' }> {
  // POST /api/sessions/join-as-operator (authenticate 미적용 — JWT body 검증만)
  const response = await api.post<{
    groupId: string;
    experimentMode: 'DUAL_2PC';
  }>('/sessions/join-as-operator', { token });
  return response.data;
}
