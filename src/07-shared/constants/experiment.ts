/**
 * [Shared] 실험 모드 식별자 상수 정의함
 */
export const EXPERIMENT_MODES = {
  /** 2인 동시 측정 모드 (Phase 1) */
  DUAL: 'DUAL',
  /** 뇌BTI 성향 측정 모드 (Phase 1) */
  BTI: 'BTI',
  /** 시분할 측정 모드 (1PC 환경, Phase 14 P2) */
  SEQUENTIAL: 'SEQUENTIAL',
} as const;

/**
 * [Shared] 실험 모드 유니온 타입 — EXPERIMENT_MODES에서 자동 유도함
 */
export type ExperimentMode =
  (typeof EXPERIMENT_MODES)[keyof typeof EXPERIMENT_MODES];

/**
 * [Shared] 실험 모드별 세부 설정 상수 정의함
 */
export const EXPERIMENT_CONFIG = {
  /**
   * 2인용 대조 분석 실험 모드 설정임
   */
  DUAL: {
    mode: 'DUAL' as ExperimentMode,
    targetCount: 2,
    title: 'Dual Subject Monitor',
    description: '그룹 식별자를 통해 두 피실험자의 데이터를 대조 분석함',
  },
  /**
   * 1인용 뇌BTI 성향 측정 모드 설정임
   */
  BTI: {
    mode: 'BTI' as ExperimentMode,
    targetCount: 1,
    title: 'Brain-BTI Analyzer',
    description: '개인별 뇌파 특성을 분석하여 성향 유형을 도출함',
  },
  /**
   * 1PC 순차 측정 모드 설정임 — DUAL과 동일한 2인 페어링을 사용하되
   * 측정은 한 장치에서 순차로 수행됨
   */
  SEQUENTIAL: {
    mode: 'SEQUENTIAL' as ExperimentMode,
    targetCount: 2,
    title: 'Sequential Subject Monitor',
    description: '한 장치에서 두 피실험자의 데이터를 순차 측정하여 유사도를 분석함',
  },
} as const;

/** 최소 분석 가능 시간(초) — 백엔드 MIN_ANALYSIS_SECONDS와 동기화 필수 */
export const MIN_ANALYSIS_SECONDS = 180;

/** 결과 폴링 최대 대기 시간(초) */
export const POLLING_TIMEOUT_SECONDS = 120;

/** 결과 폴링 간격(ms) */
export const POLLING_INTERVAL_MS = 5000;
