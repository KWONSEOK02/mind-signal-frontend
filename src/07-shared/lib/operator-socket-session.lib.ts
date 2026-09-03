/**
 * 운영자 소켓 세션 저장 데이터 규격 정의함.
 */
export interface OperatorSocketSession {
  socketToken: string;
  socketTokenExpiresAt: number;
  experimentMode: 'DUAL_2PC';
}

const OPERATOR_SOCKET_SESSION_KEY_PREFIX =
  'mind-signal:operator-socket-session';

const getStorageKey = (groupId: string) =>
  `${OPERATOR_SOCKET_SESSION_KEY_PREFIX}:${groupId}`;

/**
 * groupId별 운영자 소켓 세션을 현재 탭에 저장함.
 *
 * @param groupId - 그룹 식별자
 * @param session - 소켓 토큰, 만료 시각, 실험 모드
 * @throws DOMException — sessionStorage 접근 또는 저장 차단 시
 */
export function saveOperatorSocketSession(
  groupId: string,
  session: OperatorSocketSession
): void {
  sessionStorage.setItem(getStorageKey(groupId), JSON.stringify(session));
}

/**
 * groupId에 대응하는 운영자 소켓 세션을 현재 탭에서 조회함.
 *
 * @param groupId - 그룹 식별자
 * @returns 저장 데이터 또는 유효한 데이터 부재 시 null
 */
export function readOperatorSocketSession(
  groupId: string
): OperatorSocketSession | null {
  try {
    const rawSession = sessionStorage.getItem(getStorageKey(groupId));
    if (!rawSession) return null;

    const session: unknown = JSON.parse(rawSession);
    if (
      !session ||
      typeof session !== 'object' ||
      !('socketToken' in session) ||
      typeof session.socketToken !== 'string' ||
      !('socketTokenExpiresAt' in session) ||
      typeof session.socketTokenExpiresAt !== 'number' ||
      !Number.isFinite(session.socketTokenExpiresAt) ||
      !('experimentMode' in session) ||
      session.experimentMode !== 'DUAL_2PC'
    ) {
      return null;
    }

    return {
      socketToken: session.socketToken,
      socketTokenExpiresAt: session.socketTokenExpiresAt,
      experimentMode: session.experimentMode,
    };
  } catch {
    return null;
  }
}

const ACTIVE_GROUP_KEY = 'mind-signal:operator-active-group';

/**
 * 현재 탭이 운영 중인 groupId를 저장함.
 *
 * URL 쿼리 대신 sessionStorage를 쓰는 이유 — `?groupId=`는 stale 값이 신선한 페어링을
 * 덮어쓰는 표류를 만든 전력이 있음(F2 회귀). 소켓 토큰과 같은 저장소, 같은 수명을 씀.
 *
 * @param groupId - 그룹 식별자. null이면 저장분 제거함
 */
export function saveActiveGroupId(groupId: string | null): void {
  try {
    if (groupId) sessionStorage.setItem(ACTIVE_GROUP_KEY, groupId);
    else sessionStorage.removeItem(ACTIVE_GROUP_KEY);
  } catch {
    // 저장 차단이 실험 진행을 막지 않도록 무시함
  }
}

/**
 * 현재 탭이 운영 중이던 groupId를 조회함.
 *
 * @returns 저장된 groupId 또는 부재 시 null
 */
export function readActiveGroupId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_GROUP_KEY);
  } catch {
    return null;
  }
}
