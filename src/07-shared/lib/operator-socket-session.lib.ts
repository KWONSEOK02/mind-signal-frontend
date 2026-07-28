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
