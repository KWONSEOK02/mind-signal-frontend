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
  createdPairing: (groupId?: string, experimentMode?: string) =>
    api.post<PairingResponse>('/sessions', {
      ...(groupId ? { groupId } : {}),
      ...(experimentMode ? { experimentMode } : {}),
    }),

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

  /**
   * Admin 강제 페어링 요청 수행함 — pairingToken 세션에 email 대상 사용자 강제 연결함.
   *
   * @param pairingToken - QR pairing 토큰 문자열
   * @param email - 대상 사용자 이메일 (admin이 입력)
   * @param options - axios per-request config (timeout / signal 등)
   * @returns AxiosResponse 200 — body는 modal close trigger로만 사용함
   * @throws AxiosError 401 — 인증 만료 / 403 — admin 권한 없음 / 404 — 대상 또는 토큰 불일치 / 400 — Zod validation / ECONNABORTED — timeout
   */
  forcePairing: (
    pairingToken: string,
    email: string,
    options?: { signal?: AbortSignal; timeout?: number }
  ) =>
    api.post<PairingResponse>(
      `/sessions/${pairingToken}/admin-pair`,
      { email },
      options
    ),
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
  // POST /api/sessions/:groupId/invite-operator — 응답 envelope { status, data } 언래핑함
  // (BE controller가 res.json({ status, data: { token, expiresAt } }) 반환 — data.data가 실제 페이로드)
  const response = await api.post<{
    status: string;
    data: { token: string; expiresAt: number };
  }>(`/sessions/${groupId}/invite-operator`);
  return response.data.data;
}

/**
 * Operator로 그룹 합류 요청 수행함 (Phase 16 — BE-1-join 연동)
 *
 * @param token - 초대 JWT 토큰 문자열
 * @returns 그룹 ID + 실험 모드 확인 응답
 * @throws ApiError 401 — 토큰 검증 실패 또는 만료 시
 */
export async function joinAsOperator(token: string): Promise<{
  groupId: string;
  experimentMode: 'DUAL_2PC';
  socketToken: string;
  socketTokenExpiresAt: number;
}> {
  // POST /api/sessions/join-as-operator — 응답 envelope { status, data } 언래핑함
  const response = await api.post<{
    status: string;
    data: {
      groupId: string;
      experimentMode: 'DUAL_2PC';
      socketToken: string;
      socketTokenExpiresAt: number;
    };
  }>('/sessions/join-as-operator', { token });
  return response.data.data;
}
