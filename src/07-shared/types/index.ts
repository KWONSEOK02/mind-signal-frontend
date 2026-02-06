export type PageType = 'home' | 'intro' | 'lab' | 'results' | 'expand';

export interface User {
  userId: string;
  email: string;
  name: string;
  brainType: string;
  membershipLevel: string;
}

export interface EegRecord {
  recordId: string;
  userId: string;
  sessionId: string;
  consentId: string;
  rawDataPath: string;
  eegSummary: object;
  measuredAt: string;
}

export interface AnalysisResult {
  analysisId: string;
  userId: string;
  recordId: string;
  matchingScore: number;
  aiComment: string;
  createdAt: string;
}
