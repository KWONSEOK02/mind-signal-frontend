/**
 * [Constant] 페어링 세션의 실시간 상태 비교를 위한 런타임 값임
 */
export const SESSION_STATUS = {
  IDLE: 'IDLE',
  CREATED: 'CREATED',
  PAIRED: 'PAIRED',
  EXPIRED: 'EXPIRED',
  ERROR: 'ERROR',
} as const;

/**
 * [Type] SESSION_STATUS 값에 기반한 유니온 타입 정의함
 */
export type PairingSessionStatus =
  (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];
