/**
 * [Shared] 내비 항목 단일 출처.
 *
 * navbar 와 footer 가 같은 목록을 각자 하드코딩하고 있었다(A8). 한쪽만 고치면
 * 두 곳이 어긋나므로 여기를 정본으로 둔다.
 *
 * `url` 이 있는 항목은 외부 링크라 페이지 이동이 아니라 새 탭으로 연다.
 * 작업실 링크가 평문 http 인 것은 별건이다 — mind-signal-frontend#75.
 */
import type { PageType } from '../types';

export interface NavItem {
  /** navbar 표기 */
  name: string;
  /** footer 표기. 없으면 name 을 쓴다 */
  footerName?: string;
  id: PageType | 'workspace';
  /** 외부 링크일 때만 있음 */
  url?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { name: '홈', id: 'home' },
  { name: '소개', footerName: '프로젝트 소개', id: 'intro' },
  { name: '실험실', id: 'lab' },
  { name: '작업실', id: 'workspace', url: 'http://seyun4047.iptime.org:10209/' },
  { name: '결과확인', id: 'results' },
  { name: '시즌 2', id: 'expand' },
] as const;

/** 예약 폼. navbar 의 예약하기 버튼이 쓴다. */
export const GOOGLE_FORM_URL = 'https://forms.gle/g1vY9QuH1QjBzNmm9';
