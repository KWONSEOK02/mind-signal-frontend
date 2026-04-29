import api from './base';

// ──────────────────────────────────────────────
// GET /engine/registry-status 응답 타입 정의함
// ──────────────────────────────────────────────

/**
 * DE 그룹 등록 상태 응답 타입 정의함
 *
 * ready=true → 두 subject 모두 DE에 등록 완료 + 측정 가능 상태임
 */
export interface RegistryStatus {
  ready: boolean;
  registered: 0 | 1 | 2;
  attempts: number;
  inFlight: boolean;
  lastError?:
    | 'subject_1_failed'
    | 'subject_2_failed'
    | 'both_failed'
    | 'invalid_secret'
    | 'not_pending_mode'
    | 'group_id_conflict'
    | 'precondition_unmet';
  startedAt?: number;
  finishedAt?: number;
}

// ──────────────────────────────────────────────
// POST /engine/dual-trigger 응답 타입 정의함
// ──────────────────────────────────────────────

/**
 * dual-trigger 응답 상태 유니온 타입 정의함
 */
export type DualTriggerStatus = 'triggered' | 'in_progress' | 'already_ready';

/**
 * dual-trigger 응답 타입 정의함
 */
export interface DualTriggerResponse {
  status: DualTriggerStatus;
}

// ──────────────────────────────────────────────
// API 호출 함수 정의함
// ──────────────────────────────────────────────

/**
 * DE 그룹 등록 상태 조회함 (DUAL_2PC polling 전용)
 *
 * @param groupId - 그룹 식별자
 * @param signal - AbortController 신호 (폴링 취소 목적)
 * @returns 등록 상태 객체
 */
export async function fetchRegistryStatus(
  groupId: string,
  signal?: AbortSignal
): Promise<RegistryStatus> {
  const { data } = await api.get<RegistryStatus>('/engine/registry-status', {
    params: { groupId },
    signal,
  });
  return data;
}

/**
 * DE 양측 subject 등록 트리거 요청함 (DUAL_2PC 전용)
 *
 * @param groupId - 그룹 식별자
 * @returns 트리거 응답 (triggered / in_progress / already_ready)
 */
export async function postDualTrigger(
  groupId: string
): Promise<DualTriggerResponse> {
  const { data } = await api.post<DualTriggerResponse>('/engine/dual-trigger', {
    groupId,
  });
  return data;
}
