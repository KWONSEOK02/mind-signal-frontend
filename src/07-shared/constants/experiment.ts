/**
 * [Shared] 실험 모드 종류 정의함
 */
export type ExperimentMode = 'DUAL' | 'BTI';

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
} as const;
