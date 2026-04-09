import { PairingSessionStatus } from '../constants/session-status';

export type PageType = 'home' | 'intro' | 'lab' | 'results' | 'expand' | 'join';

/** 측정 종료 사유 (BE Zod enum과 동기화) */
export type StopReason =
  | 'Natural'
  | 'ManualEarly'
  | 'HeadsetLost'
  | 'ProcessError';

/** 분석 결과 3-tier 분류 (BE triggerPostMeasurementByTier와 동기화) */
export type AnalysisTier = 'VALID' | 'PARTIAL' | 'ABORTED';

/**
 * [Shared] 도메인 특성을 반영한 사용자 역할 타입 정의함
 */
export type UserRole = 'OPERATOR' | 'SUBJECT';

/**
 * 사용자 정보 인터페이스 정의함
 */
export interface User {
  userId: string;
  email: string;
  name: string;
  brainType: string;
  membershipLevel: string;
}

/**
 * 뇌파 기록 인터페이스 정의함
 */
export interface EegRecord {
  recordId: string;
  userId: string;
  sessionId: string;
  consentId: string;
  rawDataPath: string;
  eegSummary: object;
  measuredAt: string;
}

/**
 * [Shared] 데이터 통신을 위한 페어링 응답 전문 구조 정의함
 * subjectIndex 속성을 추가하여 피실험자 번호 식별 가능하게 함
 */
export interface PairingData {
  id: string;
  groupId: string;
  pairingToken: string;
  userId: string;
  role: UserRole;
  subjectIndex?: number; // 누락된 속성 추가 완료함
  status: PairingSessionStatus;
  pairedAt: string | null;
  expiresAt: string;
  measuredAt: string | null;
  guestJoined?: boolean;
}

/**
 * 분석 결과 인터페이스 정의함
 */
export interface AnalysisResult {
  analysisId: string;
  userId: string;
  recordId: string;
  matchingScore: number;
  aiComment: string;
  createdAt: string;
}
